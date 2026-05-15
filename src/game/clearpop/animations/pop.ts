/**
 * Pop Animations — Toy Blast style.
 *
 * Three tile-death variants:
 *   popCellFast      — quick shrink + fade (regular group clear, bomb, adjacency damage)
 *   popCellWithPunch — scale punch then shrink (rocket line)
 *   popCellBurst     — dramatic wind-up → hold → implode (color burst)
 */

import gsap from 'gsap';
import type { BlockVisual } from '../renderers/block-renderer';

/**
 * Fast pop: scale → 0 with back.in overshoot + alpha → 0.
 * ~200ms vacuum-into-itself feel.
 */
export function popCellFast(visual: BlockVisual): Promise<void> {
  return new Promise<void>((resolve) => {
    gsap.killTweensOf(visual.container.scale);
    gsap.killTweensOf(visual.container);
    gsap.to(visual.container, {
      alpha: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
    gsap.to(visual.container.scale, {
      x: 0,
      y: 0,
      duration: 0.2,
      ease: 'back.in(2)',
      onComplete: () => {
        visual.container.parent?.removeChild(visual.container);
        resolve();
      },
    });
  });
}

/**
 * Rocket-line pop: brief 108% scale punch over 55ms, then the same
 * vacuum-shrink as popCellFast. The punch gives each tile a snappy
 * "hit" before it gets sucked away.
 */
export function popCellWithPunch(visual: BlockVisual): Promise<void> {
  return new Promise<void>((resolve) => {
    gsap.killTweensOf(visual.container.scale);
    gsap.killTweensOf(visual.container);

    gsap.timeline({
      onComplete: () => {
        visual.container.parent?.removeChild(visual.container);
        resolve();
      },
    })
      .to(visual.container.scale, {
        x: 1.08,
        y: 1.08,
        duration: 0.055,
        ease: 'power2.out',
      })
      .to(visual.container, {
        alpha: 0,
        duration: 0.2,
        ease: 'power2.in',
      })
      .to(visual.container.scale, {
        x: 0,
        y: 0,
        duration: 0.2,
        ease: 'back.in(2)',
      }, '<');
  });
}

/**
 * Color-burst pop: dramatic two-phase swell → hold → implode (~420ms).
 *
 * Wind-up (140ms): swell to 118%
 * Hold    (100ms): continue swelling to 126%
 * Implode (180ms): rapid shrink to 0 with elastic overshoot + fade
 *
 * A concurrent 114% scale punch over 90ms fires alongside the wind-up
 * so the tile gets a visible "hit" at the start of its death sequence.
 */
export function popCellBurst(visual: BlockVisual): Promise<void> {
  return new Promise<void>((resolve) => {
    gsap.killTweensOf(visual.container.scale);
    gsap.killTweensOf(visual.container);

    gsap.timeline({
      onComplete: () => {
        visual.container.parent?.removeChild(visual.container);
        resolve();
      },
    })
      .to(visual.container.scale, {
        x: 1.18,
        y: 1.18,
        duration: 0.14,
        ease: 'power2.out',
      })
      .to(visual.container.scale, {
        x: 1.26,
        y: 1.26,
        duration: 0.1,
        ease: 'power2.inOut',
      })
      .to(visual.container, {
        alpha: 0,
        duration: 0.14,
        ease: 'power2.in',
      }, '-=0.04')
      .to(visual.container.scale, {
        x: 0,
        y: 0,
        duration: 0.18,
        ease: 'back.in(2)',
      }, '<');
  });
}

/**
 * Standard group pop: all visuals pop with fast animation.
 * Optional stagger for a ripple effect.
 */
export function animatePop(
  visuals: BlockVisual[],
  staggerMs = 0,
): Promise<void> {
  if (visuals.length === 0) return Promise.resolve();

  const promises = visuals.map((visual, i) => {
    if (staggerMs > 0) {
      return new Promise<void>((resolve) => {
        gsap.delayedCall(i * (staggerMs / 1000), () => {
          popCellFast(visual).then(resolve);
        });
      });
    }
    return popCellFast(visual);
  });

  return Promise.all(promises).then(() => {});
}

/**
 * Cascade glow: brief brightness pulse before pop.
 */
export function animateCascadeGlow(visuals: BlockVisual[]): Promise<void> {
  if (visuals.length === 0) return Promise.resolve();

  const promises = visuals.map(
    (visual) =>
      new Promise<void>((resolve) => {
        gsap.to(visual.container.scale, {
          x: 1.15,
          y: 1.15,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          onComplete: resolve,
        });
      }),
  );

  return Promise.all(promises).then(() => {});
}
