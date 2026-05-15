/**
 * Base render object for all Three.js-rendered visual modules.
 *
 * Same lifecycle contract as PixiRenderable, backed by THREE.Group.
 * Stub — fleshed out when a game needs the Three.js backend.
 *
 * Requires `three` as a dependency. Import path:
 *   import { ThreeRenderable } from '~/modules/primitives/_base';
 */

// NOTE: Uncomment when three is added as a dependency.
//
// import gsap from 'gsap';
// import { Group } from 'three';
//
// export class ThreeRenderable extends Group {
//   active = true;
//   label: string;
//
//   constructor(label: string) {
//     super();
//     this.label = label;
//   }
//
//   /** Called once after the render object is added to the scene graph. */
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
//     for (const child of this.children) {
//       if (child instanceof ThreeRenderable) {
//         child.tick(dt);
//       }
//     }
//   }
//
//   destroy(): void {
//     gsap.killTweensOf(this);
//     gsap.killTweensOf(this.scale);
//     // Three.js Group doesn't have removeAllListeners — cleanup is manual
//     for (const child of [...this.children]) {
//       if (child instanceof ThreeRenderable) {
//         child.destroy();
//       }
//       this.remove(child);
//     }
//   }
// }

export {};
