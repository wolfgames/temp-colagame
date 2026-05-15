/**
 * Combo Animations
 *
 * 900ms anticipation orbit/spiral, heavy screen shake, confetti burst.
 */

import gsap from 'gsap';
import { Container } from 'pixi.js';
import type { BoardRenderer } from '../renderers/board-renderer';
import type { GridPos } from '../state/types';
import { shakeContainer } from './feedback';

export function animateComboAnticipation(
  posA: GridPos,
  posB: GridPos,
  boardRenderer: BoardRenderer,
): Promise<void> {
  const visualA = boardRenderer.getVisual(posA.row, posA.col);
  const visualB = boardRenderer.getVisual(posB.row, posB.col);

  if (!visualA || !visualB) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const centerX = (visualA.container.x + visualB.container.x) / 2;
    const centerY = (visualA.container.y + visualB.container.y) / 2;
    const radiusX = Math.abs(visualA.container.x - centerX) + 10;
    const radiusY = Math.abs(visualA.container.y - centerY) + 10;

    const tl = gsap.timeline({
      onComplete: () => {
        shakeContainer(boardRenderer.container, 8, 0.3);
        resolve();
      },
    });

    const duration = 0.9;
    const obj = { angle: 0 };

    tl.to(obj, {
      angle: Math.PI * 4,
      duration,
      ease: 'power2.in',
      onUpdate: () => {
        if (visualA.container.destroyed || visualB.container.destroyed) return;
        visualA.container.x = centerX + Math.cos(obj.angle) * radiusX;
        visualA.container.y = centerY + Math.sin(obj.angle) * radiusY;
        visualB.container.x = centerX - Math.cos(obj.angle) * radiusX;
        visualB.container.y = centerY - Math.sin(obj.angle) * radiusY;

        const scale = 1 + (obj.angle / (Math.PI * 4)) * 0.3;
        visualA.container.scale.set(scale);
        visualB.container.scale.set(scale);
      },
    });
  });
}
