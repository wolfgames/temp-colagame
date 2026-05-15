/**
 * Pixi Effects — low-level VFX primitives.
 *
 * screenShake, zoomPunch, scalePunch, colorFlash, flyText, freezeFrame,
 * shakeElement.  All fire-and-forget (no awaiting required).
 */

import gsap from 'gsap';
import { Container, Graphics, Text } from 'pixi.js';

// Caches each container's true resting position so concurrent shakes don't drift
const _restingPos = new WeakMap<Container, { x: number; y: number; rotation: number }>();

export function screenShake(
  container: Container,
  amplitude: number,
  durationMs: number,
  heavy = false,
): void {
  // Record resting position on first use; never overwrite with a mid-shake value
  if (!_restingPos.has(container)) {
    _restingPos.set(container, { x: container.x, y: container.y, rotation: container.rotation });
  }
  const rest = _restingPos.get(container)!;
  const origX = rest.x;
  const origY = rest.y;
  const origRot = rest.rotation;
  const cycles = heavy ? 8 : 5;
  const dur = durationMs / 1000 / (cycles * 2);
  const rotAmplitude = heavy ? 0.012 : 0;

  gsap.killTweensOf(container, 'x,y,rotation');
  container.x = origX;
  container.y = origY;
  container.rotation = origRot;

  const tl = gsap.timeline({
    onComplete: () => {
      container.x = origX;
      container.y = origY;
      container.rotation = origRot;
    },
  });

  for (let i = 0; i < cycles; i++) {
    const decay = 1 - i / cycles;
    const a = amplitude * decay;
    const r = rotAmplitude * decay;
    const sign = i % 2 === 0 ? 1 : -1;

    tl.to(container, {
      x: origX + a * sign,
      y: origY + (heavy ? a * 0.5 * -sign : 0),
      rotation: origRot + r * sign,
      duration: dur,
      ease: 'power1.inOut',
    });
    tl.to(container, {
      x: origX - a * sign * 0.7,
      y: origY - (heavy ? a * 0.3 * -sign : 0),
      rotation: origRot - r * sign * 0.7,
      duration: dur,
      ease: 'power1.inOut',
    });
  }
}

export function zoomPunch(
  container: Container,
  targetScale: number,
  durationMs: number,
): void {
  gsap.killTweensOf(container.scale, 'x,y');
  gsap.fromTo(
    container.scale,
    { x: targetScale, y: targetScale },
    { x: 1, y: 1, duration: durationMs / 1000, ease: 'power2.out' },
  );
}

export function scalePunch(
  container: Container,
  targetScale: number,
  durationMs: number,
): void {
  gsap.killTweensOf(container.scale, 'x,y');
  gsap.fromTo(
    container.scale,
    { x: targetScale, y: targetScale },
    { x: 1, y: 1, duration: durationMs / 1000, ease: 'back.out(2)' },
  );
}

export function colorFlash(
  stage: Container,
  color: number,
  alpha: number,
  durationMs: number,
  width = 800,
  height = 1400,
): void {
  const overlay = new Graphics();
  overlay.rect(-width / 2, -height / 2, width * 2, height * 2).fill({ color, alpha });
  overlay.eventMode = 'none';
  stage.addChild(overlay);

  gsap.to(overlay, {
    alpha: 0,
    duration: durationMs / 1000,
    ease: 'power2.out',
    onComplete: () => {
      overlay.parent?.removeChild(overlay);
      overlay.destroy();
    },
  });
}

export function flyText(
  parent: Container,
  label: string,
  x: number,
  y: number,
  colorHex: string,
  durationMs: number,
  scaleFactor = 1,
): void {
  const text = new Text({
    text: label,
    style: {
      fontFamily: 'Baloo, system-ui, sans-serif',
      fontSize: Math.round(28 * scaleFactor),
      fontWeight: '700',
      fill: colorHex,
      stroke: { color: '#000000', width: 3 },
    },
  });
  text.anchor.set(0.5, 0.5);
  text.x = x;
  text.y = y;
  parent.addChild(text);

  gsap.to(text, {
    y: y - 70 * scaleFactor,
    alpha: 0,
    duration: durationMs / 1000,
    ease: 'power2.out',
    onComplete: () => {
      gsap.killTweensOf(text);
      text.parent?.removeChild(text);
      text.destroy();
    },
  });
}

export function freezeFrame(ms: number): Promise<void> {
  return new Promise((resolve) => {
    gsap.delayedCall(ms / 1000, resolve);
  });
}

export function shakeElement(
  container: Container,
  amplitude: number,
  durationMs: number,
): void {
  const origX = container.x;
  const step = durationMs / 5000;
  gsap.timeline()
    .to(container, { x: origX - amplitude, duration: step })
    .to(container, { x: origX + amplitude, duration: step })
    .to(container, { x: origX - amplitude * 0.5, duration: step })
    .to(container, { x: origX + amplitude * 0.5, duration: step })
    .to(container, { x: origX, duration: step });
}
