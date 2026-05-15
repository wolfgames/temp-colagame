/**
 * Power-Up Detonation Animations
 *
 * Rocket:      flying projectiles + 42ms staggered tile pops in their wake
 * Bomb:        42ms per Chebyshev ring, entire ring pops simultaneously
 * Color Burst: 52ms stagger in reading order, dramatic swell → implode
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { GridPos } from '../state/types';
import type { ComboType, BombColorblastTarget, RocketColorblastTarget } from '../state/powerup-logic';
import type { BoardRenderer } from '../renderers/board-renderer';
import { popCellFast, popCellWithPunch, popCellBurst } from './pop';
import {
  spawnCandyBurstParticles,
  spawnFireBurnOnCell,
  spawnFireSpread,
  launchCandyProjectile,
} from '../juice/pixi-particles';

const ROCKET_STAGGER = 0.042;
const BOMB_RING_STAGGER = 0.042;
const BURST_STAGGER = 0.052;

type RocketDir = 'up' | 'down' | 'left' | 'right';

function isHorizontalDir(dir: RocketDir): boolean {
  return dir === 'left' || dir === 'right';
}

/**
 * Rocket: two projectile copies fly outward from origin along the
 * row/column. Tiles pop in their wake with 42ms stagger.
 *
 * @param rocketTexture — texture for the flying projectile (null = skip flight, tile pops only)
 * @param fxLayer       — container for the projectiles (stage-level, above board)
 */
export function animateRocketDetonation(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  direction: RocketDir = 'right',
  _rocketTexture: Texture | null = null,
  fxLayer: Container | null = null,
): Promise<void> {
  const layout = boardRenderer.getLayout();
  const tileSize = layout.tileSize;
  const horiz = isHorizontalDir(direction);
  const step = tileSize + layout.gap;
  const boardGlobal = boardRenderer.container.getGlobalPosition();

  const originCell = affectedCells.find(
    (p) => p.row === origin.row && p.col === origin.col,
  );
  const nonOrigin = affectedCells.filter(
    (p) => !(p.row === origin.row && p.col === origin.col),
  );

  const sorted = [...nonOrigin].sort((a, b) => {
    const distA = horiz
      ? Math.abs(a.col - origin.col)
      : Math.abs(a.row - origin.row);
    const distB = horiz
      ? Math.abs(b.col - origin.col)
      : Math.abs(b.row - origin.row);
    return distA - distB;
  });

  const promises: Promise<void>[] = [];
  const FIRE_SPREAD_DELAY = 0.055;

  // Build a set of all affected cell keys so fire spread never starts from an obstacle cell.
  const affectedSet = new Set(affectedCells.map((p) => `${p.row},${p.col}`));

  if (originCell) {
    const originVisual = boardRenderer.getVisual(originCell.row, originCell.col);
    if (originVisual) {
      const os = boardRenderer.gridToScreen(originCell.row, originCell.col);
      const ox = boardGlobal.x + os.x + tileSize / 2;
      const oy = boardGlobal.y + os.y + tileSize / 2;
      if (fxLayer) {
        spawnFireBurnOnCell(fxLayer, ox, oy, tileSize);
      }
      promises.push(popCellWithPunch(originVisual));
    }
  }

  sorted.forEach((pos) => {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    if (!visual) return;

    const tileDist = horiz
      ? Math.abs(pos.col - origin.col)
      : Math.abs(pos.row - origin.row);
    const delay = tileDist * FIRE_SPREAD_DELAY;

    const cellScreen = boardRenderer.gridToScreen(pos.row, pos.col);
    const cellX = boardGlobal.x + cellScreen.x + tileSize / 2;
    const cellY = boardGlobal.y + cellScreen.y + tileSize / 2;

    const prevRow = horiz ? pos.row : (pos.row > origin.row ? pos.row - 1 : pos.row + 1);
    const prevCol = horiz ? (pos.col > origin.col ? pos.col - 1 : pos.col + 1) : pos.col;
    const prevScreen = boardRenderer.gridToScreen(prevRow, prevCol);
    const prevX = boardGlobal.x + prevScreen.x + tileSize / 2;
    const prevY = boardGlobal.y + prevScreen.y + tileSize / 2;

    // Only draw the fire trail from a previous cell if that cell was actually a cleared
    // block (in affectedCells). Obstacle cells (e.g. marshmallow) are not cleared, so
    // we skip the spread to avoid making blockers look like they are burning.
    const prevIsCleared = affectedSet.has(`${prevRow},${prevCol}`);

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(delay, () => {
          if (fxLayer) {
            if (prevIsCleared) {
              spawnFireSpread(fxLayer, prevX, prevY, cellX, cellY, tileSize, horiz);
            }
            spawnFireBurnOnCell(fxLayer, cellX, cellY, tileSize);
          }
          popCellWithPunch(visual).then(resolve);
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

/**
 * Bomb (Kernel Pop): a popcorn sprite arc-launches from the origin to each
 * affected cell in Chebyshev-ring order.  On landing, the popcorn sprite
 * pops (scale punch + fade) and the underlying block is cleared.
 */
export function animateBombDetonation(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
  popcornTextures: Texture[] = [],
  onObstacleHit?: (pos: GridPos) => void,
): Promise<void> {
  if (!fxLayer || popcornTextures.length === 0) {
    return animateBombDetonationFallback(affectedCells, origin, boardRenderer);
  }

  const layout = boardRenderer.getLayout();
  const tileSize = layout.tileSize;
  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const originScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const startX = boardGlobal.x + originScreen.x + tileSize / 2;
  const startY = boardGlobal.y + originScreen.y + tileSize / 2;

  const sorted = [...affectedCells].sort((a, b) => {
    const ringA = Math.max(Math.abs(a.col - origin.col), Math.abs(a.row - origin.row));
    const ringB = Math.max(Math.abs(b.col - origin.col), Math.abs(b.row - origin.row));
    return ringA - ringB;
  });

  const promises: Promise<void>[] = [];

  sorted.forEach((pos, i) => {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    const isOrigin = pos.row === origin.row && pos.col === origin.col;

    if (!visual && isOrigin) return;

    const cellScreen = boardRenderer.gridToScreen(pos.row, pos.col);
    const endX = boardGlobal.x + cellScreen.x + tileSize / 2;
    const endY = boardGlobal.y + cellScreen.y + tileSize / 2;

    const tex = popcornTextures[i % popcornTextures.length];
    const popcorn = new Sprite(tex);
    popcorn.anchor.set(0.5);
    const maxDim = Math.max(tex.width, tex.height);
    const fitScale = (tileSize * 0.85) / maxDim;
    popcorn.scale.set(fitScale * 0.5);
    popcorn.x = startX;
    popcorn.y = startY;
    popcorn.alpha = 1;
    fxLayer.addChild(popcorn);

    const ring = Math.max(Math.abs(pos.col - origin.col), Math.abs(pos.row - origin.row));
    const delay = i * 0.04;
    const flightDur = isOrigin ? 0.01 : 0.25 + ring * 0.05;
    const arcHeight = -tileSize * (0.6 + ring * 0.25);

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(delay, () => {
          const progress = { t: 0 };
          gsap.to(progress, {
            t: 1,
            duration: flightDur,
            ease: 'power1.out',
            onUpdate: () => {
              const t = progress.t;
              popcorn.x = startX + (endX - startX) * t;
              const linearY = startY + (endY - startY) * t;
              popcorn.y = linearY + arcHeight * 4 * t * (1 - t);
              const s = fitScale * (0.5 + t * 0.5);
              popcorn.scale.set(s);
              popcorn.rotation = t * Math.PI * 2 * (i % 2 === 0 ? 1 : -1);
            },
            onComplete: () => {
              gsap.killTweensOf(progress);
              gsap.to(popcorn.scale, {
                x: fitScale * 1.4, y: fitScale * 1.4,
                duration: 0.08,
                ease: 'power2.out',
                onComplete: () => {
                  gsap.to(popcorn, {
                    alpha: 0,
                    duration: 0.15,
                    ease: 'power2.in',
                  });
                  gsap.to(popcorn.scale, {
                    x: 0, y: 0,
                    duration: 0.15,
                    ease: 'back.in(2)',
                    onComplete: () => {
                      popcorn.parent?.removeChild(popcorn);
                      popcorn.destroy();
                    },
                  });
                },
              });
              if (visual) {
                popCellWithPunch(visual).then(resolve);
              } else {
                onObstacleHit?.(pos);
                resolve();
              }
            },
          });
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

function animateBombDetonationFallback(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const pos of affectedCells) {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    if (!visual) continue;
    const ring = Math.max(
      Math.abs(pos.col - origin.col),
      Math.abs(pos.row - origin.row),
    );
    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(ring * BOMB_RING_STAGGER, () => {
          popCellWithPunch(visual).then(resolve);
        });
      }),
    );
  }
  return Promise.all(promises).then(() => {});
}

/**
 * Kernel Pop prelude: the kernel sprite shakes, swells, then bursts open
 * before popcorn projectiles fly out to each affected cell.
 */
export function animateKernelPopPrelude(
  origin: GridPos,
  boardRenderer: BoardRenderer,
): Promise<void> {
  const sprite = boardRenderer.getPowerupSpriteAt(origin.row, origin.col);
  if (!sprite) {
    boardRenderer.removePowerupAt(origin.row, origin.col);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const origX = sprite.x;

    const shakeTl = gsap.timeline({
      onComplete: () => {
        gsap.to(sprite.scale, {
          x: 1.4, y: 1.4,
          duration: 0.08,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(sprite.scale, {
              x: 0, y: 0,
              duration: 0.1,
              ease: 'back.in(3)',
              onComplete: () => {
                boardRenderer.removePowerupAt(origin.row, origin.col);
                resolve();
              },
            });
            gsap.to(sprite, { alpha: 0, duration: 0.1, ease: 'power2.in' });
          },
        });
      },
    });

    const amp = 4;
    const cycles = 5;
    const stepDur = 0.03;
    for (let i = 0; i < cycles; i++) {
      const decay = 1 - i / (cycles + 1);
      shakeTl.to(sprite, { x: origX + amp * decay, duration: stepDur, ease: 'power2.inOut' });
      shakeTl.to(sprite, { x: origX - amp * decay, duration: stepDur, ease: 'power2.inOut' });
    }
    shakeTl.to(sprite, { x: origX, duration: 0.02 });
  });
}

/**
 * Color Blast prelude: the jar shakes with escalating intensity, swells
 * as pressure builds, then explodes with a candy burst before imploding.
 */
export function animateColorBlastPrelude(
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container,
): Promise<void> {
  const sprite = boardRenderer.getPowerupSpriteAt(origin.row, origin.col);
  if (!sprite) {
    boardRenderer.removePowerupAt(origin.row, origin.col);
    return Promise.resolve();
  }

  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const cellScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const layout = boardRenderer.getLayout();
  const centerX = boardGlobal.x + cellScreen.x + layout.tileSize / 2;
  const centerY = boardGlobal.y + cellScreen.y + layout.tileSize / 2;

  return new Promise<void>((resolve) => {
    const origX = sprite.x;
    const origY = sprite.y;
    const baseScaleX = sprite.scale.x;
    const baseScaleY = sprite.scale.y;

    const shakeTl = gsap.timeline({
      onComplete: () => {
        spawnCandyBurstParticles(fxLayer, centerX, centerY, 32);

        gsap.to(sprite.scale, {
          x: baseScaleX * 1.5, y: baseScaleY * 1.5,
          duration: 0.06,
          ease: 'power3.out',
          onComplete: () => {
            gsap.to(sprite.scale, {
              x: 0, y: 0,
              duration: 0.12,
              ease: 'back.in(4)',
              onComplete: () => {
                boardRenderer.removePowerupAt(origin.row, origin.col);
                resolve();
              },
            });
            gsap.to(sprite, { alpha: 0, duration: 0.12, ease: 'power2.in' });
          },
        });
      },
    });

    const cycles = 10;
    const minStep = 0.032;
    const maxAmp = 7;
    for (let i = 0; i < cycles; i++) {
      const ramp = (i + 1) / cycles;
      const amp = maxAmp * ramp;
      const stepDur = minStep - ramp * 0.008;
      shakeTl.to(sprite, { x: origX + amp, duration: stepDur, ease: 'power2.inOut' });
      shakeTl.to(sprite, { x: origX - amp, duration: stepDur, ease: 'power2.inOut' });
      if (i > cycles * 0.5) {
        const vertAmp = amp * 0.4;
        shakeTl.to(sprite, { y: origY + vertAmp, duration: stepDur * 0.5, ease: 'power2.inOut' }, '<');
        shakeTl.to(sprite, { y: origY - vertAmp, duration: stepDur * 0.5, ease: 'power2.inOut' });
      }
      shakeTl.to(sprite.scale, {
        x: baseScaleX * (1 + ramp * 0.15),
        y: baseScaleY * (1 + ramp * 0.15),
        duration: stepDur * 2,
        ease: 'power1.inOut',
      }, '<');
    }
    shakeTl.to(sprite, { x: origX, y: origY, duration: 0.02 });
  });
}

/**
 * Chili Rocket prelude: the pepper glows red-hot, shakes with increasing
 * intensity, then erupts in a fire trail along the row/column axis.
 */
export function animatePopcornRocketPrelude(
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container,
  direction: 'up' | 'down' | 'left' | 'right' = 'right',
): Promise<void> {
  const sprite = boardRenderer.getPowerupSpriteAt(origin.row, origin.col);
  if (!sprite) {
    boardRenderer.removePowerupAt(origin.row, origin.col);
    return Promise.resolve();
  }

  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const cellScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const layout = boardRenderer.getLayout();
  const centerX = boardGlobal.x + cellScreen.x + layout.tileSize / 2;
  const centerY = boardGlobal.y + cellScreen.y + layout.tileSize / 2;

  return new Promise<void>((resolve) => {
    const origX = sprite.x;
    const origY = sprite.y;

    const heatGlow = new Graphics();
    heatGlow.circle(0, 0, layout.tileSize * 0.6).fill({ color: 0xff4400, alpha: 0 });
    heatGlow.x = centerX;
    heatGlow.y = centerY;
    fxLayer.addChild(heatGlow);

    gsap.to(heatGlow, { alpha: 0.4, duration: 0.35, ease: 'power2.in' });

    const shakeTl = gsap.timeline({
      onComplete: () => {
        spawnFireBurnOnCell(fxLayer, centerX, centerY, layout.tileSize);

        gsap.to(heatGlow, {
          alpha: 0, duration: 0.2, ease: 'power2.out',
          onComplete: () => {
            heatGlow.parent?.removeChild(heatGlow);
            heatGlow.destroy();
          },
        });

        gsap.to(sprite.scale, {
          x: 0, y: 0,
          duration: 0.15,
          ease: 'back.in(3)',
          onComplete: () => {
            boardRenderer.removePowerupAt(origin.row, origin.col);
            resolve();
          },
        });
        gsap.to(sprite, { alpha: 0, duration: 0.15, ease: 'power2.in' });
      },
    });

    const amp = 5;
    const cycles = 7;
    const stepDur = 0.028;
    const shakeHoriz = direction === 'left' || direction === 'right';
    for (let i = 0; i < cycles; i++) {
      const decay = 1 - i / (cycles + 1);
      if (shakeHoriz) {
        shakeTl.to(sprite, { y: origY + amp * decay, duration: stepDur, ease: 'power2.inOut' });
        shakeTl.to(sprite, { y: origY - amp * decay, duration: stepDur, ease: 'power2.inOut' });
      } else {
        shakeTl.to(sprite, { x: origX + amp * decay, duration: stepDur, ease: 'power2.inOut' });
        shakeTl.to(sprite, { x: origX - amp * decay, duration: stepDur, ease: 'power2.inOut' });
      }
    }
    shakeTl.to(sprite, { x: origX, y: origY, duration: 0.02 });
  });
}

/**
 * Color Burst: candy projectiles arc-fly from the origin to each affected
 * cell, sorted by distance so nearby cells get hit first. On landing,
 * the candy splats and the underlying block pops.
 */
export function animateColorBurstDetonation(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
): Promise<void> {
  const layout = boardRenderer.getLayout();
  const tileSize = layout.tileSize;
  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const originScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const startX = boardGlobal.x + originScreen.x + tileSize / 2;
  const startY = boardGlobal.y + originScreen.y + tileSize / 2;

  const sorted = [...affectedCells].sort((a, b) => {
    const distA = Math.abs(a.row - origin.row) + Math.abs(a.col - origin.col);
    const distB = Math.abs(b.row - origin.row) + Math.abs(b.col - origin.col);
    if (distA !== distB) return distA - distB;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const promises: Promise<void>[] = [];

  sorted.forEach((pos, i) => {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    if (!visual) return;

    const cellScreen = boardRenderer.gridToScreen(pos.row, pos.col);
    const endX = boardGlobal.x + cellScreen.x + tileSize / 2;
    const endY = boardGlobal.y + cellScreen.y + tileSize / 2;
    const isOrigin = pos.row === origin.row && pos.col === origin.col;

    if (isOrigin || !fxLayer) {
      promises.push(
        new Promise<void>((resolve) => {
          gsap.delayedCall(i * BURST_STAGGER, () => {
            popCellBurst(visual).then(resolve);
          });
        }),
      );
      return;
    }

    const launchDelay = i * 0.035;

    promises.push(
      new Promise<void>((resolve) => {
        launchCandyProjectile(
          fxLayer, startX, startY, endX, endY, tileSize, launchDelay,
        ).then(() => {
          popCellBurst(visual).then(resolve);
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

// ---------------------------------------------------------------------------
// Combo Orbit Anticipation
// ---------------------------------------------------------------------------

const COMBO_ORBIT_DURATION = 0.9;
const COMBO_ORBIT_REVOLUTIONS = 2;
const COMBO_SPIN_SPEED = Math.PI * 8;

/**
 * Orbit animation: two powerup sprites circle around their shared midpoint
 * while spinning on their own axis (z-rotation dance). They spiral inward
 * and merge. Sprites are destroyed at the end.
 *
 * @param centerA - screen position (in fxLayer space) of sprite A
 * @param centerB - screen position (in fxLayer space) of sprite B
 */
export function animateComboOrbit(
  spriteA: Container,
  spriteB: Container,
  fxLayer: Container,
  centerA: { x: number; y: number },
  centerB: { x: number; y: number },
): Promise<{ mergeX: number; mergeY: number }> {
  const startAx = centerA.x;
  const startAy = centerA.y;
  const startBx = centerB.x;
  const startBy = centerB.y;

  const midX = (startAx + startBx) / 2;
  const midY = (startAy + startBy) / 2;

  fxLayer.addChild(spriteA);
  fxLayer.addChild(spriteB);
  spriteA.position.set(startAx, startAy);
  spriteB.position.set(startBx, startBy);

  const baseScaleA = spriteA.scale.x;
  const baseScaleB = spriteB.scale.x;

  const dx = startAx - midX;
  const dy = startAy - midY;
  const initialRadius = Math.sqrt(dx * dx + dy * dy);
  const initialAngle = Math.atan2(dy, dx);

  return new Promise<{ mergeX: number; mergeY: number }>((resolve) => {
    const progress = { t: 0 };
    gsap.to(progress, {
      t: 1,
      duration: COMBO_ORBIT_DURATION,
      ease: 'power2.in',
      onUpdate: () => {
        const t = progress.t;
        const orbitAngle = initialAngle + t * Math.PI * 2 * COMBO_ORBIT_REVOLUTIONS;
        const radius = initialRadius * (1 - t);

        spriteA.position.set(
          midX + Math.cos(orbitAngle) * radius,
          midY + Math.sin(orbitAngle) * radius,
        );
        spriteB.position.set(
          midX - Math.cos(orbitAngle) * radius,
          midY - Math.sin(orbitAngle) * radius,
        );

        const spin = t * COMBO_SPIN_SPEED;
        spriteA.rotation = spin;
        spriteB.rotation = -spin;

        const fade = 1 - t * 0.3;
        spriteA.scale.set(baseScaleA * fade);
        spriteB.scale.set(baseScaleB * fade);
      },
      onComplete: () => {
        gsap.killTweensOf(progress);
        spriteA.parent?.removeChild(spriteA);
        spriteB.parent?.removeChild(spriteB);
        spriteA.destroy({ children: true });
        spriteB.destroy({ children: true });
        resolve({ mergeX: midX, mergeY: midY });
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Combo Detonation
// ---------------------------------------------------------------------------

/**
 * Combo detonation: plays the appropriate tile-death pattern for
 * the combo type. Same wave/ring/sweep patterns as solo detonations,
 * just covering the larger combo blast area.
 *
 * - Rocket-family combos (rocket+rocket, rocket+bomb): outward wave / rings
 * - Bomb-family combos (bomb+bomb): ring-by-ring expansion
 * - Burst-involving combos: reading-order sweep with dramatic pop
 */
export function animateComboDetonation(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  comboType: ComboType,
  fxLayer: Container | null = null,
  rocketTexture: Texture | null = null,
  popcornTextures: Texture[] = [],
  partnerOrigin?: GridPos,
): Promise<void> {
  switch (comboType) {
    case 'rocket_rocket':
      return animateComboRocketCross(affectedCells, origin, boardRenderer, fxLayer, rocketTexture, partnerOrigin);
    case 'rocket_bomb':
      return animateComboRocketBomb(affectedCells, origin, boardRenderer, fxLayer, rocketTexture);
    case 'bomb_bomb':
      return animateBombDetonation(affectedCells, origin, boardRenderer, fxLayer, popcornTextures);
    case 'colorblast_colorblast':
    case 'rocket_colorblast':
    case 'bomb_colorblast':
      return animateComboBurstSweep(affectedCells, boardRenderer);
    default:
      return Promise.resolve();
  }
}

/**
 * Rocket+Rocket: fire sweeps posA's full row + column AND posB's perpendicular
 * direction simultaneously. Adjacent rockets share one axis so the combined
 * pattern is a cross-plus-one-extra-sweep (H or I shape depending on orientation).
 */
function animateComboRocketCross(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
  rocketTexture: Texture | null = null,
  partnerOrigin?: GridPos,
): Promise<void> {
  const rowCells = affectedCells.filter((p) => p.row === origin.row);
  const colCells = affectedCells.filter((p) => p.col === origin.col);

  const sweeps: Promise<void>[] = [
    animateRocketDetonation(rowCells, origin, boardRenderer, 'right', rocketTexture, fxLayer),
    animateRocketDetonation(colCells, origin, boardRenderer, 'down', rocketTexture, fxLayer),
  ];

  if (partnerOrigin) {
    // Horizontal neighbors: partner is in same row → animate partner's unique column
    if (partnerOrigin.row === origin.row && partnerOrigin.col !== origin.col) {
      const partnerColCells = affectedCells.filter((p) => p.col === partnerOrigin.col);
      sweeps.push(
        animateRocketDetonation(partnerColCells, partnerOrigin, boardRenderer, 'down', rocketTexture, fxLayer),
      );
    }
    // Vertical neighbors: partner is in same col → animate partner's unique row
    if (partnerOrigin.col === origin.col && partnerOrigin.row !== origin.row) {
      const partnerRowCells = affectedCells.filter((p) => p.row === partnerOrigin.row);
      sweeps.push(
        animateRocketDetonation(partnerRowCells, partnerOrigin, boardRenderer, 'right', rocketTexture, fxLayer),
      );
    }
  }

  return Promise.all(sweeps).then(() => {});
}

/**
 * Rocket+Bomb: fire sweeps 3 parallel rows and 3 parallel columns simultaneously
 * (the bomb widens the pepper's single-axis sweep into a thick cross).
 * Pure fire — no popcorn.
 */
function animateComboRocketBomb(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
  rocketTexture: Texture | null = null,
): Promise<void> {
  const sweeps: Promise<void>[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    const row = origin.row + dr;
    const rowCells = affectedCells.filter((p) => p.row === row);
    const rowOrigin: GridPos = { row, col: origin.col };
    sweeps.push(animateRocketDetonation(rowCells, rowOrigin, boardRenderer, 'right', rocketTexture, fxLayer));
  }

  for (let dc = -1; dc <= 1; dc++) {
    const col = origin.col + dc;
    const colCells = affectedCells.filter((p) => p.col === col && p.row !== origin.row - 1 && p.row !== origin.row && p.row !== origin.row + 1);
    const colOrigin: GridPos = { row: origin.row, col };
    sweeps.push(animateRocketDetonation(colCells, colOrigin, boardRenderer, 'down', rocketTexture, fxLayer));
  }

  return Promise.all(sweeps).then(() => {});
}

/**
 * Bomb-family combos (legacy ring expansion — kept for fallback use).
 */
function animateComboRingExpansion(
  affectedCells: GridPos[],
  origin: GridPos,
  boardRenderer: BoardRenderer,
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const pos of affectedCells) {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    if (!visual) continue;

    const ring = Math.max(
      Math.abs(pos.col - origin.col),
      Math.abs(pos.row - origin.row),
    );

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(ring * BOMB_RING_STAGGER, () => {
          popCellWithPunch(visual).then(resolve);
        });
      }),
    );
  }

  return Promise.all(promises).then(() => {});
}

/**
 * Burst-involving combos: reading-order sweep with the dramatic
 * swell→implode pop. Covers the full affected area.
 */
function animateComboBurstSweep(
  affectedCells: GridPos[],
  boardRenderer: BoardRenderer,
): Promise<void> {
  const sorted = [...affectedCells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const promises: Promise<void>[] = [];

  sorted.forEach((pos, i) => {
    const visual = boardRenderer.getVisual(pos.row, pos.col);
    if (!visual) return;

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(i * BURST_STAGGER, () => {
          popCellBurst(visual).then(resolve);
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

// ---------------------------------------------------------------------------
// Bomb + Color Blast Combo
// ---------------------------------------------------------------------------

const BOMB_COLORBLAST_LAUNCH_STAGGER = 0.12;

/**
 * Bomb + Color Blast combo: bomb projectiles launch from the mixing point
 * toward each color-matched cell (top-to-bottom order). Each projectile
 * lands and triggers a full standard bomb detonation at that cell.
 *
 * @param onBombLand — optional callback fired when each bomb lands (for audio/juice)
 */
export function animateBombColorblastCombo(
  origin: GridPos,
  targets: BombColorblastTarget[],
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
  popcornTextures: Texture[] = [],
  bombTexture: Texture | null = null,
  onBombLand?: (target: BombColorblastTarget) => void,
): Promise<void> {
  if (targets.length === 0) return Promise.resolve();

  const layout = boardRenderer.getLayout();
  const tileSize = layout.tileSize;
  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const originScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const startX = boardGlobal.x + originScreen.x + tileSize / 2;
  const startY = boardGlobal.y + originScreen.y + tileSize / 2;

  const promises: Promise<void>[] = [];

  targets.forEach((target, idx) => {
    const launchDelay = idx * BOMB_COLORBLAST_LAUNCH_STAGGER;

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(launchDelay, () => {
          animateSingleBombColorblastTarget(
            target, startX, startY, tileSize, boardGlobal,
            boardRenderer, fxLayer, popcornTextures, bombTexture,
            onBombLand,
          ).then(resolve);
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

async function animateSingleBombColorblastTarget(
  target: BombColorblastTarget,
  startX: number,
  startY: number,
  tileSize: number,
  boardGlobal: { x: number; y: number },
  boardRenderer: BoardRenderer,
  fxLayer: Container | null,
  popcornTextures: Texture[],
  bombTexture: Texture | null,
  onBombLand?: (target: BombColorblastTarget) => void,
): Promise<void> {
  const targetScreen = boardRenderer.gridToScreen(target.bombPos.row, target.bombPos.col);
  const endX = boardGlobal.x + targetScreen.x + tileSize / 2;
  const endY = boardGlobal.y + targetScreen.y + tileSize / 2;

  if (bombTexture && fxLayer) {
    await animateBombProjectileFlight(
      startX, startY, endX, endY,
      tileSize, bombTexture, fxLayer,
    );
  }

  onBombLand?.(target);

  const targetVisual = boardRenderer.getVisual(target.bombPos.row, target.bombPos.col);
  if (targetVisual) {
    boardRenderer.setVisual(target.bombPos.row, target.bombPos.col, null);
    popCellWithPunch(targetVisual);
  }

  await animateBombDetonation(
    target.blastCells,
    target.bombPos,
    boardRenderer,
    fxLayer,
    popcornTextures,
  );

  for (const cell of target.blastCells) {
    boardRenderer.setVisual(cell.row, cell.col, null);
  }
}

// ---------------------------------------------------------------------------
// Rocket + Color Blast Combo
// ---------------------------------------------------------------------------

const ROCKET_COLORBLAST_LAUNCH_STAGGER = 0.12;

/**
 * Rocket + Color Blast combo: pepper projectiles arc-fly from the mixing
 * point toward each color-matched cell in top-to-bottom order. Each pepper
 * lands and triggers a full row+col cross sweep from that position.
 * Detonations overlap — each starts `ROCKET_COLORBLAST_LAUNCH_STAGGER`
 * after the previous launch so the chain feels rapid but sequential.
 *
 * @param onRocketLand — optional callback fired when each pepper lands (for audio/juice)
 */
export function animateRocketColorblastCombo(
  origin: GridPos,
  targets: RocketColorblastTarget[],
  boardRenderer: BoardRenderer,
  fxLayer: Container | null = null,
  rocketTexture: Texture | null = null,
  onRocketLand?: (target: RocketColorblastTarget) => void,
): Promise<void> {
  if (targets.length === 0) return Promise.resolve();

  const layout = boardRenderer.getLayout();
  const tileSize = layout.tileSize;
  const boardGlobal = boardRenderer.container.getGlobalPosition();
  const originScreen = boardRenderer.gridToScreen(origin.row, origin.col);
  const startX = boardGlobal.x + originScreen.x + tileSize / 2;
  const startY = boardGlobal.y + originScreen.y + tileSize / 2;

  const promises: Promise<void>[] = [];

  targets.forEach((target, idx) => {
    const launchDelay = idx * ROCKET_COLORBLAST_LAUNCH_STAGGER;

    promises.push(
      new Promise<void>((resolve) => {
        gsap.delayedCall(launchDelay, () => {
          animateSingleRocketColorblastTarget(
            target, startX, startY, tileSize, boardGlobal,
            boardRenderer, fxLayer, rocketTexture, onRocketLand,
          ).then(resolve);
        });
      }),
    );
  });

  return Promise.all(promises).then(() => {});
}

async function animateSingleRocketColorblastTarget(
  target: RocketColorblastTarget,
  startX: number,
  startY: number,
  tileSize: number,
  boardGlobal: { x: number; y: number },
  boardRenderer: BoardRenderer,
  fxLayer: Container | null,
  rocketTexture: Texture | null,
  onRocketLand?: (target: RocketColorblastTarget) => void,
): Promise<void> {
  const targetScreen = boardRenderer.gridToScreen(target.rocketPos.row, target.rocketPos.col);
  const endX = boardGlobal.x + targetScreen.x + tileSize / 2;
  const endY = boardGlobal.y + targetScreen.y + tileSize / 2;

  if (rocketTexture && fxLayer) {
    await animateRocketProjectileFlight(startX, startY, endX, endY, tileSize, rocketTexture, fxLayer);
  }

  onRocketLand?.(target);

  // Pop the block at the landing cell (it was a color-matched block)
  const landingVisual = boardRenderer.getVisual(target.rocketPos.row, target.rocketPos.col);
  if (landingVisual) {
    boardRenderer.setVisual(target.rocketPos.row, target.rocketPos.col, null);
    popCellWithPunch(landingVisual);
  }

  // Spawn fire burst at landing point
  if (fxLayer) {
    spawnFireBurnOnCell(fxLayer, endX, endY, tileSize);
  }

  // Fire in one direction only — matches the single-axis nature of a pepper rocket
  const rocketDir = target.direction === 'horizontal' ? 'right' : 'down';
  await animateRocketDetonation(target.blastCells, target.rocketPos, boardRenderer, rocketDir, rocketTexture, fxLayer);

  for (const cell of target.blastCells) {
    boardRenderer.setVisual(cell.row, cell.col, null);
  }
}

function animateRocketProjectileFlight(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileSize: number,
  rocketTexture: Texture,
  fxLayer: Container,
): Promise<void> {
  const rocketSprite = new Sprite(rocketTexture);
  rocketSprite.anchor.set(0.5);
  const maxDim = Math.max(rocketTexture.width, rocketTexture.height);
  const fitScale = (tileSize * 1.0) / maxDim;
  rocketSprite.scale.set(fitScale * 0.35);
  rocketSprite.x = startX;
  rocketSprite.y = startY;
  rocketSprite.alpha = 1;
  fxLayer.addChild(rocketSprite);

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Flatter arc than bomb — rockets feel like they're fired, not lobbed
  const arcHeight = -Math.max(tileSize * 0.8, dist * 0.22);
  const flightDur = Math.max(0.15, 0.12 + dist / (tileSize * 15));

  return new Promise<void>((resolve) => {
    const progress = { t: 0 };
    gsap.to(progress, {
      t: 1,
      duration: flightDur,
      ease: 'power2.out',
      onUpdate: () => {
        const t = progress.t;
        rocketSprite.x = startX + dx * t;
        const linearY = startY + dy * t;
        rocketSprite.y = linearY + arcHeight * 4 * t * (1 - t);
        rocketSprite.scale.set(fitScale * (0.35 + t * 0.65));
        // Rotate to face direction of travel
        rocketSprite.rotation = Math.atan2(
          dy + arcHeight * 4 * (1 - 2 * t),
          dx,
        );
      },
      onComplete: () => {
        gsap.killTweensOf(progress);
        gsap.killTweensOf(rocketSprite);
        gsap.killTweensOf(rocketSprite.scale);
        rocketSprite.parent?.removeChild(rocketSprite);
        rocketSprite.destroy();
        resolve();
      },
    });
  });
}

function animateBombProjectileFlight(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileSize: number,
  bombTexture: Texture,
  fxLayer: Container,
): Promise<void> {
  const bombSprite = new Sprite(bombTexture);
  bombSprite.anchor.set(0.5);
  const maxDim = Math.max(bombTexture.width, bombTexture.height);
  const fitScale = (tileSize * 1.1) / maxDim;
  bombSprite.scale.set(fitScale * 0.3);
  bombSprite.x = startX;
  bombSprite.y = startY;
  bombSprite.alpha = 1;
  fxLayer.addChild(bombSprite);

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arcHeight = -Math.max(tileSize * 1.2, dist * 0.35);
  const flightDur = Math.max(0.2, 0.15 + dist / (tileSize * 12));

  return new Promise<void>((resolve) => {
    const progress = { t: 0 };
    gsap.to(progress, {
      t: 1,
      duration: flightDur,
      ease: 'power2.out',
      onUpdate: () => {
        const t = progress.t;
        bombSprite.x = startX + dx * t;
        const linearY = startY + dy * t;
        bombSprite.y = linearY + arcHeight * 4 * t * (1 - t);
        bombSprite.scale.set(fitScale * (0.3 + t * 0.7));
        bombSprite.rotation = t * Math.PI * 3;
      },
      onComplete: () => {
        gsap.killTweensOf(progress);
        gsap.killTweensOf(bombSprite);
        gsap.killTweensOf(bombSprite.scale);
        bombSprite.parent?.removeChild(bombSprite);
        bombSprite.destroy();
        resolve();
      },
    });
  });
}
