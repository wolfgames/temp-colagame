/**
 * Gravity & Refill Animations — Toy Blast style.
 *
 * Moved cells: tween from old position → new position with back.out(1.4)
 * overshoot. Positions come through the board renderer's topology-driven
 * `gridToScreen`, so the same animation services rect, hex, or radial
 * motion — paths are 2-waypoint linear for all three v1 topologies.
 *
 * Matches the reference GridLayer `animateGravity` (~280ms, back.out).
 */

import gsap from 'gsap';
import type { BoardRenderer } from '../renderers/board-renderer';
import type { FallMovement, RefillEntry } from '../state/types';

const FALL_DURATION = 0.28;
const FALL_EASE = 'back.out(1.4)';

export function animateGravity(
  movements: FallMovement[],
  boardRenderer: BoardRenderer,
): Promise<void> {
  if (movements.length === 0) return Promise.resolve();

  const promises: Promise<void>[] = [];

  for (const mv of movements) {
    // Try block visual first, then obstacle, then powerup
    const visual = boardRenderer.getVisual(mv.from.row, mv.from.col);
    if (visual) {
      const target = boardRenderer.gridToScreen(mv.to.row, mv.to.col);
      const fromX = visual.container.x;
      const fromY = visual.container.y;

      boardRenderer.setVisual(mv.from.row, mv.from.col, null);
      boardRenderer.setVisual(mv.to.row, mv.to.col, visual);
      visual.gridRow = mv.to.row;
      visual.gridCol = mv.to.col;

      promises.push(
        new Promise<void>((resolve) => {
          gsap.fromTo(
            visual.container,
            { x: fromX, y: fromY },
            { x: target.x, y: target.y, duration: FALL_DURATION, ease: FALL_EASE, onComplete: resolve },
          );
        }),
      );
      continue;
    }

    // Obstacle sprite
    const obstacleSprite = boardRenderer.getObstacleSpriteAt(mv.from.row, mv.from.col);
    if (obstacleSprite) {
      const fromScreen = boardRenderer.gridToScreen(mv.from.row, mv.from.col);
      const toScreen = boardRenderer.gridToScreen(mv.to.row, mv.to.col);
      const deltaX = toScreen.x - fromScreen.x;
      const deltaY = toScreen.y - fromScreen.y;
      boardRenderer.moveObstacleSprite(mv.from.row, mv.from.col, mv.to.row, mv.to.col);

      promises.push(
        new Promise<void>((resolve) => {
          gsap.to(obstacleSprite, {
            x: obstacleSprite.x + deltaX,
            y: obstacleSprite.y + deltaY,
            duration: FALL_DURATION,
            ease: FALL_EASE,
            onComplete: resolve,
          });
        }),
      );
      continue;
    }

    // Powerup sprite
    const puSprite = boardRenderer.getPowerupSpriteAt(mv.from.row, mv.from.col);
    if (puSprite) {
      const fromScreen = boardRenderer.gridToScreen(mv.from.row, mv.from.col);
      const toScreen = boardRenderer.gridToScreen(mv.to.row, mv.to.col);
      const deltaX = toScreen.x - fromScreen.x;
      const deltaY = toScreen.y - fromScreen.y;
      boardRenderer.movePowerupSprite(mv.from.row, mv.from.col, mv.to.row, mv.to.col);

      promises.push(
        new Promise<void>((resolve) => {
          gsap.to(puSprite, {
            x: puSprite.x + deltaX,
            y: puSprite.y + deltaY,
            duration: FALL_DURATION,
            ease: FALL_EASE,
            onComplete: resolve,
          });
        }),
      );
      continue;
    }
  }

  return Promise.all(promises).then(() => {});
}

export function animateRefill(
  refills: RefillEntry[],
  boardRenderer: BoardRenderer,
): Promise<void> {
  if (refills.length === 0) return Promise.resolve();

  const layout = boardRenderer.getLayout();
  const step = layout.tileSize + layout.gap;
  const blockRenderer = boardRenderer.getBlockRenderer();
  const topology = boardRenderer.getTopology();
  const promises: Promise<void>[] = [];

  for (const entry of refills) {
    const visual = blockRenderer.acquire(entry.color, entry.targetRow, entry.col);
    const target = boardRenderer.gridToScreen(entry.targetRow, entry.col);

    let startX = target.x;
    let startY = target.y;

    if (topology && entry.spawnId && entry.cellId) {
      // Topology-driven entry: spline from the topology's declared refill
      // start to the target. For rect/hex (vertical fall) this is a no-op
      // visually compared to the legacy "stack above the column" approach;
      // for radial, pieces enter from outside the outer ring along the
      // spoke. dropDistance still controls per-chain stagger so cells in
      // the same chain arrive sequentially.
      const path = boardRenderer.refillEntryPath(entry.spawnId, entry.cellId);
      const corner = boardRenderer.gridToScreen(entry.targetRow, entry.col);
      const half = layout.tileSize / 2;
      // Path waypoints are centres; convert to top-left and add the chain
      // stagger by overshooting along the inbound vector.
      const enterCenter = path[0];
      const dx = corner.x + half - enterCenter.x;
      const dy = corner.y + half - enterCenter.y;
      const inboundLen = Math.hypot(dx, dy) || 1;
      const stagger = Math.max(0, entry.dropDistance - 1) * step;
      startX = enterCenter.x - half - (dx / inboundLen) * stagger;
      startY = enterCenter.y - half - (dy / inboundLen) * stagger;
    } else {
      // Legacy rect path — vertical column stack above the board.
      startY = -(entry.dropDistance * step);
    }

    visual.container.x = startX;
    visual.container.y = startY;
    visual.container.alpha = 0;
    visual.container.scale.set(1);

    boardRenderer.addBlockVisual(visual);
    boardRenderer.setVisual(entry.targetRow, entry.col, visual);

    promises.push(
      new Promise<void>((resolve) => {
        gsap.fromTo(
          visual.container,
          { x: startX, y: startY, alpha: 0 },
          {
            x: target.x,
            y: target.y,
            alpha: 1,
            duration: FALL_DURATION,
            ease: FALL_EASE,
            onComplete: resolve,
          },
        );
      }),
    );
  }

  return Promise.all(promises).then(() => {});
}
