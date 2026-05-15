import { Container } from 'pixi.js';
import gsap from 'gsap';

/**
 * Base render object for all Pixi-rendered visual modules.
 *
 * Standardizes the lifecycle contract for render objects in `renderers/pixi.ts`:
 * - `init()` — called once after added to the display tree
 * - `update(dt)` — per-frame logic for this render object
 * - `resize(w, h)` — respond to viewport changes
 * - `tick(dt)` — calls `update` then cascades to active renderable children
 * - `destroy()` — GSAP cleanup, listener removal, child destruction
 *
 * Data and game logic live outside this class (in `defaults.ts`, `tuning.ts`,
 * or ECS components). This class is purely the visual representation.
 */
export class PixiRenderable extends Container {
  /** Set to false to skip update and cascade for this subtree. */
  active = true;

  constructor(label: string) {
    super();
    this.label = label;
  }

  /** Called once after the render object is added to the display tree. Override in subclasses. */
  init(): void {}

  /** Per-frame logic for this render object. Override in subclasses. */
  update(_dt: number): void {}

  /** Respond to viewport resize. Override in subclasses. */
  resize(_width: number, _height: number): void {}

  /** Called by the game loop — ticks self then cascades to active renderable children. */
  tick(dt: number): void {
    if (!this.active) return;
    this.update(dt);
    for (const child of this.children) {
      if (child instanceof PixiRenderable) {
        child.tick(dt);
      }
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    this.removeAllListeners();
    super.destroy(options ?? { children: true });
  }
}
