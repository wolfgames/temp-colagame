/**
 * Feedback Animations
 *
 * Screen shake, reject shake, score fly-text.
 */

import gsap from 'gsap';
import { Container, Text } from 'pixi.js';

const _restingPos = new WeakMap<Container, { x: number; y: number }>();

export function shakeContainer(
  container: Container,
  intensity: number = 4,
  duration: number = 0.3,
): void {
  if (!_restingPos.has(container)) {
    _restingPos.set(container, { x: container.x, y: container.y });
  }
  const rest = _restingPos.get(container)!;
  const startX = rest.x;
  const startY = rest.y;

  gsap.killTweensOf(container, 'x');
  container.x = startX;

  gsap.to(container, {
    x: startX + intensity,
    duration: duration / 6,
    ease: 'power1.inOut',
    repeat: 5,
    yoyo: true,
    onComplete: () => {
      container.x = startX;
      container.y = startY;
    },
  });
}

export function rejectShake(container: Container): void {
  const startX = container.x;
  gsap.timeline()
    .to(container, { x: startX - 4, duration: 0.04 })
    .to(container, { x: startX + 4, duration: 0.04 })
    .to(container, { x: startX - 2, duration: 0.04 })
    .to(container, { x: startX, duration: 0.04 });
}

export function scoreFloatText(
  parent: Container,
  score: number,
  x: number,
  y: number,
  fontFamily: string = 'Baloo, system-ui, sans-serif',
): void {
  const text = new Text({
    text: `+${score}`,
    style: {
      fontFamily,
      fontSize: 28,
      fontWeight: '700',
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
    },
  });
  text.anchor.set(0.5, 0.5);
  text.x = x;
  text.y = y;
  parent.addChild(text);

  gsap.to(text, {
    y: y - 60,
    alpha: 0,
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => {
      gsap.killTweensOf(text);
      text.parent?.removeChild(text);
      text.destroy();
    },
  });
}
