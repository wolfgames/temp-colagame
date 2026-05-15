/**
 * Base render object for all Phaser-rendered visual modules.
 *
 * Same lifecycle contract as PixiRenderable, backed by Phaser.GameObjects.Container.
 * Stub — fleshed out when a game needs the Phaser backend.
 *
 * Requires `phaser` as a dependency. Import path:
 *   import { PhaserRenderable } from '~/modules/primitives/_base';
 */

// NOTE: Uncomment when phaser is added as a dependency.
//
// import gsap from 'gsap';
//
// export class PhaserRenderable extends Phaser.GameObjects.Container {
//   active = true;
//
//   constructor(scene: Phaser.Scene, x: number, y: number, label: string) {
//     super(scene, x, y);
//     this.name = label;
//   }
//
//   /** Called once after the render object is added to the scene. */
//   init(): void {}
//
//   /** Per-frame logic for this render object. */
//   update(_dt: number): void {}
//
//   /** Respond to viewport resize. */
//   resize(_width: number, _height: number): void {}
//
//   /** Called by the game loop — ticks self then cascades to active renderable children. */
//   tick(dt: number): void {
//     if (!this.active) return;
//     this.update(dt);
//     for (const child of this.list) {
//       if (child instanceof PhaserRenderable) {
//         child.tick(dt);
//       }
//     }
//   }
//
//   override destroy(fromScene?: boolean): void {
//     gsap.killTweensOf(this);
//     this.removeAllListeners();
//     super.destroy(fromScene);
//   }
// }

export {};
