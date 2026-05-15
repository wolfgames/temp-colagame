/**
 * Pixi Particles — lightweight fire-and-forget particle bursts.
 *
 * Each function spawns Graphics circles/rects, tweens them with GSAP,
 * then self-destructs.  No persistent emitters, no per-frame allocation.
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

let _popcornTextures: Texture[] = [];
let _fireTextures: Texture[] = [];

/** Call once at init with the loaded popcorn particle textures. */
export function setPopcornTextures(textures: Texture[]): void {
  _popcornTextures = textures;
}

export function getPopcornTextures(): Texture[] {
  return _popcornTextures;
}

export function setFireTextures(textures: Texture[]): void {
  _fireTextures = textures;
}

export function getFireTextures(): Texture[] {
  return _fireTextures;
}

/**
 * Standard radial burst — particles shoot outward evenly, no gravity.
 * Used for group-clear feedback and power-up creation sparkles.
 */
export function spawnParticles(
  parent: Container,
  x: number,
  y: number,
  color: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    const size = 2 + Math.random() * 3;
    p.circle(0, 0, size).fill(color);
    p.x = x;
    p.y = y;
    parent.addChild(p);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 30 + Math.random() * 50;
    const dur = 0.3 + Math.random() * 0.3;

    gsap.to(p, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      duration: dur,
      ease: 'power2.out',
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

function drawParticleShape(g: Graphics, size: number, color: number): void {
  const shape = Math.floor(Math.random() * 3);
  if (shape === 0) {
    g.circle(0, 0, size).fill(color);
  } else if (shape === 1) {
    g.rect(-size, -size, size * 2, size * 2).fill(color);
  } else {
    g.moveTo(0, -size);
    g.lineTo(size, size);
    g.lineTo(-size, size);
    g.closePath();
    g.fill(color);
  }
}

/**
 * Explosion burst with upward bias and gravity arc.
 * Particles shoot out with random directions biased upward,
 * arc downward under gravity, and shrink as they fade.
 * Shapes are a mix of circles, squares, and triangles.
 * Used for rocket/bomb/color-burst tile deaths.
 */
export function spawnExplosionParticles(
  parent: Container,
  x: number,
  y: number,
  color: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    const size = 2 + Math.random() * 3;
    drawParticleShape(p, size, color);
    p.x = x;
    p.y = y;
    p.scale.set(1);
    p.rotation = Math.random() * Math.PI * 2;
    parent.addChild(p);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 60 + Math.random() * 80;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 40 - Math.random() * 30;
    const gravity = 180 + Math.random() * 60;
    const dur = 0.5 + Math.random() * 0.3;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        const t = obj.t;
        p.x = x + vx * t;
        p.y = y + vy * t + 0.5 * gravity * t * t;
        const life = t / dur;
        p.alpha = 1 - life;
        const s = 1 - life * 0.6;
        p.scale.set(Math.max(s, 0));
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

export function spawnConfetti(
  parent: Container,
  count: number,
  palette: number[],
  durationMs: number,
  stageWidth: number,
): void {
  for (let i = 0; i < count; i++) {
    const color = palette[Math.floor(Math.random() * palette.length)];
    const p = new Graphics();
    const w = 4 + Math.random() * 4;
    const h = 2 + Math.random() * 3;
    p.rect(-w / 2, -h / 2, w, h).fill(color);
    p.x = Math.random() * stageWidth;
    p.y = -10;
    p.rotation = Math.random() * Math.PI;
    parent.addChild(p);

    const dur = durationMs / 1000;
    const sway = (Math.random() - 0.5) * 100;
    const fallDist = 600 + Math.random() * 400;

    gsap.to(p, {
      y: p.y + fallDist,
      x: p.x + sway,
      rotation: p.rotation + Math.PI * (2 + Math.random() * 4),
      alpha: 0,
      duration: dur,
      ease: 'power1.in',
      delay: Math.random() * 0.3,
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Bubble pop: soft pink circles that drift gently upward and fade
 * over ~2 seconds — dreamy, slow, much gentler than gem explosions.
 */
export function spawnBubblePopParticles(
  parent: Container,
  x: number,
  y: number,
  count: number,
): void {
  const bubbleColor = 0xf5a3b5;
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    const size = 3 + Math.random() * 5;
    p.circle(0, 0, size).fill({ color: bubbleColor, alpha: 0.5 });
    p.x = x + (Math.random() - 0.5) * 12;
    p.y = y;
    parent.addChild(p);

    const driftX = (Math.random() - 0.5) * 30;
    const driftY = -(40 + Math.random() * 60);
    const dur = 1.6 + Math.random() * 0.8;

    gsap.to(p, {
      x: p.x + driftX,
      y: p.y + driftY,
      alpha: 0,
      duration: dur,
      ease: 'power1.out',
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Ice shards: jagged cyan polygons that burst outward then fall with heavy
 * gravity, persisting long enough to travel past the grid. Used when the last
 * ice block state shatters.
 */
export function spawnIceShardParticles(
  parent: Container,
  x: number,
  y: number,
  count: number,
): void {
  const shardColors = [0xffffff, 0xeaf7ff, 0xd0ecff, 0xbfe3fb];
  const edgeColor = 0x7ec6ea;
  for (let i = 0; i < count; i++) {
    const fill = shardColors[Math.floor(Math.random() * shardColors.length)];
    const p = new Graphics();
    const h = 10 + Math.random() * 10;
    const w = h * (0.35 + Math.random() * 0.25);
    const skew = (Math.random() - 0.5) * w * 0.6;
    p.moveTo(0, -h * 0.55);
    p.lineTo(w * 0.5, h * 0.1 + skew);
    p.lineTo(skew * 0.5, h * 0.55);
    p.lineTo(-w * 0.5, h * 0.1 - skew);
    p.closePath();
    p.stroke({ color: edgeColor, width: 1.2, alpha: 0.9 });
    p.fill({ color: fill, alpha: 0.9 });
    const glint = new Graphics();
    glint.moveTo(-w * 0.15, -h * 0.25);
    glint.lineTo(w * 0.1, -h * 0.35);
    glint.lineTo(w * 0.05, h * 0.1);
    glint.lineTo(-w * 0.2, 0);
    glint.closePath();
    glint.fill({ color: 0xffffff, alpha: 0.55 });
    p.addChild(glint);

    p.x = x;
    p.y = y;
    p.rotation = Math.random() * Math.PI * 2;
    parent.addChild(p);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 90 + Math.random() * 110;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (60 + Math.random() * 40);
    const gravity = 560;
    const spin = (Math.random() - 0.5) * 0.4;
    const dur = 1.2 + Math.random() * 0.6;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        const t = obj.t;
        p.x = x + vx * t;
        p.y = y + vy * t + 0.5 * gravity * t * t;
        p.rotation += spin;
        const fadeStart = dur * 0.75;
        p.alpha = t < fadeStart ? 0.95 : 0.95 * (1 - (t - fadeStart) / (dur - fadeStart));
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Candy burst: colorful gumball circles that explode outward with gravity.
 * Used when the candy-jar (color_blast) power-up detonates.
 */
export function spawnCandyBurstParticles(
  parent: Container,
  x: number,
  y: number,
  count: number,
): void {
  const candyColors = [0xff2244, 0x3388ff, 0x33bb44, 0xffcc00, 0xff8800, 0xcc44cc];
  for (let i = 0; i < count; i++) {
    const color = candyColors[Math.floor(Math.random() * candyColors.length)];
    const p = new Graphics();
    const size = 3 + Math.random() * 4;
    p.circle(0, 0, size).fill(color);
    p.circle(0, 0, size).stroke({ color: 0xffffff, width: 0.8, alpha: 0.5 });
    p.x = x;
    p.y = y;
    parent.addChild(p);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const speed = 80 + Math.random() * 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - (50 + Math.random() * 40);
    const gravity = 320 + Math.random() * 80;
    const dur = 0.6 + Math.random() * 0.3;
    const spin = (Math.random() - 0.5) * 0.3;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        const t = obj.t;
        p.x = x + vx * t;
        p.y = y + vy * t + 0.5 * gravity * t * t;
        p.rotation += spin;
        const life = t / dur;
        p.alpha = life < 0.7 ? 1 : 1 - (life - 0.7) / 0.3;
        p.scale.set(Math.max(1 - life * 0.4, 0));
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Popcorn burst: a massive wave of fluffy popcorn sprites that sweep
 * the full row or column in both directions from the origin.
 * Uses preloaded popcorn textures for realistic look; falls back to
 * Graphics circles if textures aren't loaded.
 */
export function spawnPopcornBurstParticles(
  parent: Container,
  x: number,
  y: number,
  count: number,
  horizontal: boolean,
  lineLength = 600,
): void {
  const hasTex = _popcornTextures.length > 0;
  const tints = [0xFFF8E1, 0xFFECB3, 0xFFE082, 0xFFFDE7, 0xFFFFFF];

  for (let i = 0; i < count; i++) {
    let p: Container;
    const baseSize = 0.25 + Math.random() * 0.2;

    if (hasTex) {
      const tex = _popcornTextures[Math.floor(Math.random() * _popcornTextures.length)];
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(baseSize);
      p = s;
    } else {
      const color = tints[Math.floor(Math.random() * tints.length)];
      const g = new Graphics();
      const sz = 7 + Math.random() * 9;
      g.circle(0, 0, sz).fill(color);
      g.circle(sz * 0.35, -sz * 0.25, sz * 0.55).fill(color);
      g.circle(-sz * 0.25, sz * 0.2, sz * 0.45).fill(0xFFFDE7);
      p = g;
    }

    p.x = x;
    p.y = y;
    p.alpha = 0;
    parent.addChild(p);

    const sign = i % 2 === 0 ? 1 : -1;
    const mainDist = (lineLength * 0.3) + Math.random() * (lineLength * 0.7);
    const mainSpeed = (mainDist / 0.55) * sign;
    const crossDrift = (Math.random() - 0.5) * 70;
    const spawnDelay = (i / count) * 0.1;
    const gravity = 60 + Math.random() * 40;
    const dur = 0.55 + Math.random() * 0.25;
    const spin = (Math.random() - 0.5) * 0.4;
    const initScale = p.scale.x;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      delay: spawnDelay,
      ease: 'none',
      onStart: () => { p.alpha = 1; },
      onUpdate: () => {
        const t = obj.t;
        if (horizontal) {
          p.x = x + mainSpeed * t;
          p.y = y + crossDrift * t + 0.5 * gravity * t * t;
        } else {
          p.y = y + mainSpeed * t;
          p.x = x + crossDrift * t + 0.5 * gravity * t * t;
        }
        p.rotation += spin;
        const life = t / dur;
        p.alpha = life < 0.6 ? 1 : 1 - (life - 0.6) / 0.4;
        p.scale.set(Math.max(initScale * (1 - life * 0.25), 0));
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Fire cell burn: a fire sprite appears on a cell, flares up, then
 * shrinks away. Uses loaded fire textures; falls back to Graphics.
 */
export function spawnFireBurnOnCell(
  parent: Container,
  x: number,
  y: number,
  tileSize: number,
): void {
  const count = 6 + Math.floor(Math.random() * 4);
  const hasTex = _fireTextures.length > 0;
  const tints = [0xffffff, 0xffee44, 0xffcc00, 0xffaa00];

  for (let i = 0; i < count; i++) {
    let p: Container;
    const baseScale = (tileSize * 1.4) / 64;

    if (hasTex) {
      const tex = _fireTextures[Math.floor(Math.random() * _fireTextures.length)];
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(baseScale * (0.6 + Math.random() * 0.6));
      s.tint = tints[Math.floor(Math.random() * tints.length)];
      p = s;
    } else {
      const color = tints[Math.floor(Math.random() * tints.length)];
      const g = new Graphics();
      g.circle(0, 0, 6 + Math.random() * 6).fill(color);
      p = g;
    }

    p.x = x + (Math.random() - 0.5) * tileSize * 0.5;
    p.y = y + (Math.random() - 0.5) * tileSize * 0.4;
    p.alpha = 0;
    parent.addChild(p);

    const originX = p.x;
    const originY = p.y;
    const driftY = -(25 + Math.random() * 45);
    const driftX = (Math.random() - 0.5) * 20;
    const delay = Math.random() * 0.08;
    const dur = 0.45 + Math.random() * 0.3;
    const startScale = p.scale.x;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: 1,
      duration: dur,
      delay,
      ease: 'none',
      onStart: () => { p.alpha = 1; },
      onUpdate: () => {
        const t = obj.t;
        p.x = originX + driftX * t;
        p.y = originY + driftY * t;
        const s = t < 0.3
          ? startScale * (0.4 + t * 2)
          : startScale * (1 - (t - 0.3) * 0.9);
        p.scale.set(Math.max(s, 0));
        p.alpha = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

/**
 * Fire projectile: a fire sprite that arc-flies from origin to a target
 * cell, lands, and flares. Returns a promise that resolves when the
 * projectile reaches the target (caller then pops the cell).
 */
/**
 * Fire spread: multiple fire sprites travel linearly from the previous
 * cell to the next cell, like fire crawling along a fuse. Spawns 3-5
 * fire sprites that move in a tight stream between the two positions.
 */
export function spawnFireSpread(
  parent: Container,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  tileSize: number,
  horizontal: boolean,
): void {
  const count = 4 + Math.floor(Math.random() * 3);
  const hasTex = _fireTextures.length > 0;
  const tints = [0xffffff, 0xffee44, 0xffcc00, 0xffaa00, 0xff8800];

  const dx = toX - fromX;
  const dy = toY - fromY;

  for (let i = 0; i < count; i++) {
    let p: Container;
    const baseScale = (tileSize * 1.1) / 64;

    if (hasTex) {
      const tex = _fireTextures[Math.floor(Math.random() * _fireTextures.length)];
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(baseScale * (0.4 + Math.random() * 0.4));
      s.tint = tints[Math.floor(Math.random() * tints.length)];
      p = s;
    } else {
      const g = new Graphics();
      g.circle(0, 0, 5 + Math.random() * 5).fill(0xff6600);
      p = g;
    }

    p.x = fromX + (Math.random() - 0.5) * (horizontal ? 0 : tileSize * 0.3);
    p.y = fromY + (Math.random() - 0.5) * (horizontal ? tileSize * 0.3 : 0);
    p.alpha = 0;
    parent.addChild(p);

    const stagger = (i / count) * 0.04;
    const dur = 0.08 + Math.random() * 0.06;
    const startScale = p.scale.x;
    const crossDrift = (Math.random() - 0.5) * tileSize * 0.4;
    const upDrift = -(Math.random() * 15);

    const obj = { t: 0 };
    gsap.to(obj, {
      t: 1,
      duration: dur,
      delay: stagger,
      ease: 'power1.in',
      onStart: () => { p.alpha = 1; },
      onUpdate: () => {
        const t = obj.t;
        p.x = fromX + dx * t + (horizontal ? 0 : crossDrift * t);
        p.y = fromY + dy * t + (horizontal ? crossDrift * t : 0) + upDrift * t;
        const s = t < 0.5
          ? startScale * (0.6 + t * 0.8)
          : startScale * (1 - (t - 0.5) * 1.2);
        p.scale.set(Math.max(s, 0));
        p.alpha = t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) * 1.4);
        p.rotation += 0.15 * (i % 2 === 0 ? 1 : -1);
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

export function launchFireProjectile(
  parent: Container,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileSize: number,
  delay: number,
): Promise<void> {
  const hasTex = _fireTextures.length > 0;
  const tints = [0xffffff, 0xffee44, 0xffcc00];

  let p: Container;
  const fitScale = (tileSize * 1.2) / 64;

  if (hasTex) {
    const tex = _fireTextures[Math.floor(Math.random() * _fireTextures.length)];
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.scale.set(fitScale * 0.5);
    s.tint = tints[Math.floor(Math.random() * tints.length)];
    p = s;
  } else {
    const g = new Graphics();
    g.circle(0, 0, 10).fill(0xff6600);
    p = g;
  }

  p.x = startX;
  p.y = startY;
  p.alpha = 0;
  parent.addChild(p);

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const flightDur = Math.max(0.15, Math.min(0.4, dist / 600));
  const arcHeight = -tileSize * (0.4 + (dist / tileSize) * 0.2);
  const spinDir = Math.random() > 0.5 ? 1 : -1;

  return new Promise<void>((resolve) => {
    const progress = { t: 0 };
    gsap.to(progress, {
      t: 1,
      duration: flightDur,
      delay,
      ease: 'power1.in',
      onStart: () => { p.alpha = 1; },
      onUpdate: () => {
        const t = progress.t;
        p.x = startX + dx * t;
        p.y = startY + dy * t + arcHeight * 4 * t * (1 - t);
        const s = fitScale * (0.5 + t * 0.5);
        p.scale.set(s);
        p.rotation = t * Math.PI * 2 * spinDir;
      },
      onComplete: () => {
        gsap.killTweensOf(progress);
        gsap.to(p.scale, {
          x: fitScale * 1.5, y: fitScale * 1.5,
          duration: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(p, {
              alpha: 0,
              duration: 0.15,
              ease: 'power2.in',
            });
            gsap.to(p.scale, {
              x: 0, y: 0,
              duration: 0.15,
              ease: 'back.in(2)',
              onComplete: () => {
                p.parent?.removeChild(p);
                p.destroy();
              },
            });
          },
        });
        resolve();
      },
    });
  });
}

/**
 * Candy projectile: an M&M-style candy that arc-flies from origin to a
 * target cell. Returns a promise that resolves when the candy lands
 * (caller then pops the cell). On impact the candy does a brief scale
 * punch, then fades and shatters into mini particles.
 */
export function launchCandyProjectile(
  parent: Container,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileSize: number,
  delay: number,
): Promise<void> {
  const candyColors = [0xff2244, 0x3388ff, 0x33bb44, 0xffcc00, 0xff8800, 0xcc44cc];
  const color = candyColors[Math.floor(Math.random() * candyColors.length)];

  const candy = new Graphics();
  const radius = tileSize * 0.18;
  candy.circle(0, 0, radius).fill(color);
  candy.circle(0, 0, radius).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
  candy.circle(-radius * 0.3, -radius * 0.3, radius * 0.35).fill({ color: 0xffffff, alpha: 0.45 });

  candy.x = startX;
  candy.y = startY;
  candy.alpha = 0;
  candy.scale.set(0.3);
  parent.addChild(candy);

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const flightDur = Math.max(0.18, Math.min(0.45, 0.12 + dist / (tileSize * 10)));
  const arcHeight = -tileSize * (0.5 + (dist / tileSize) * 0.2);
  const spinDir = Math.random() > 0.5 ? 1 : -1;

  return new Promise<void>((resolve) => {
    const progress = { t: 0 };
    gsap.to(progress, {
      t: 1,
      duration: flightDur,
      delay,
      ease: 'power2.in',
      onStart: () => { candy.alpha = 1; },
      onUpdate: () => {
        const t = progress.t;
        candy.x = startX + dx * t;
        candy.y = startY + dy * t + arcHeight * 4 * t * (1 - t);
        candy.scale.set(0.3 + t * 0.7);
        candy.rotation = t * Math.PI * 3 * spinDir;
      },
      onComplete: () => {
        gsap.killTweensOf(progress);

        gsap.to(candy.scale, {
          x: 1.6, y: 1.6,
          duration: 0.07,
          ease: 'power2.out',
          onComplete: () => {
            spawnCandyImpactParticles(parent, endX, endY, color, 6);
            gsap.to(candy, { alpha: 0, duration: 0.12, ease: 'power2.in' });
            gsap.to(candy.scale, {
              x: 0, y: 0,
              duration: 0.12,
              ease: 'back.in(2)',
              onComplete: () => {
                candy.parent?.removeChild(candy);
                candy.destroy();
              },
            });
          },
        });

        resolve();
      },
    });
  });
}

function spawnCandyImpactParticles(
  parent: Container,
  x: number,
  y: number,
  color: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    const size = 2 + Math.random() * 2.5;
    p.circle(0, 0, size).fill(color);
    p.x = x;
    p.y = y;
    parent.addChild(p);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 40 + Math.random() * 50;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 20;
    const gravity = 200;
    const dur = 0.35 + Math.random() * 0.15;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        const t = obj.t;
        p.x = x + vx * t;
        p.y = y + vy * t + 0.5 * gravity * t * t;
        p.alpha = 1 - (t / dur);
        p.scale.set(Math.max(1 - (t / dur) * 0.6, 0));
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}

export function spawnEggShellParticles(
  parent: Container,
  x: number,
  y: number,
  count: number,
  sizeMultiplier = 1,
): void {
  const shellColors = [0xfff3e0, 0xffe0b2, 0xffcc80, 0xffffff, 0xffd9b3];
  for (let i = 0; i < count; i++) {
    const color = shellColors[Math.floor(Math.random() * shellColors.length)];
    const p = new Graphics();
    const w = (3 + Math.random() * 5) * sizeMultiplier;
    const h = (2 + Math.random() * 3) * sizeMultiplier;
    p.moveTo(0, -h / 2);
    p.lineTo(w / 2, h / 3);
    p.lineTo(-w / 2, h / 2);
    p.closePath();
    p.fill(color);
    // Scatter spawn offset so shards don't all start at the exact same point
    p.x = x + (Math.random() - 0.5) * 20 * sizeMultiplier;
    p.y = y + (Math.random() - 0.5) * 10 * sizeMultiplier;
    p.rotation = Math.random() * Math.PI * 2;
    parent.addChild(p);

    // Downward-biased trajectory: small horizontal scatter, initial upward pop,
    // then heavy gravity pulls everything down like falling shell fragments.
    const vx = (Math.random() - 0.5) * 60 * sizeMultiplier;
    const vy = -(10 + Math.random() * 40) * sizeMultiplier; // small upward kick
    const gravity = 320 * sizeMultiplier;
    const dur = 0.6 + Math.random() * 0.5;
    const spinDir = Math.random() < 0.5 ? 1 : -1;
    const spinSpeed = (3 + Math.random() * 5) * spinDir;

    const startX = p.x;
    const startY = p.y;
    const obj = { t: 0 };
    gsap.to(obj, {
      t: dur,
      duration: dur,
      ease: 'none',
      onUpdate: () => {
        const t = obj.t;
        p.x = startX + vx * t;
        p.y = startY + vy * t + 0.5 * gravity * t * t;
        p.rotation += spinSpeed * 0.016;
        // Stay fully opaque for first 60% of flight, then fade out
        p.alpha = t / dur < 0.6 ? 1 : 1 - ((t / dur - 0.6) / 0.4);
      },
      onComplete: () => {
        p.parent?.removeChild(p);
        p.destroy();
      },
    });
  }
}
