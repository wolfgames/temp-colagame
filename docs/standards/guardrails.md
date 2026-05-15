# Guardrails

Things that will break your game. If best-practices tells you what to do, this tells you what **not** to do — and why.

---

## 1. No DOM in Game Code

The single most common mistake. Once `initGpu()` fires, **everything renders on the GPU canvas**. DOM elements float above the canvas, ignore the scene graph, break hit-testing, and can't participate in Pixi's batched rendering.

| Don't | Why it breaks | Do instead |
|---|---|---|
| `document.createElement('div')` | Floats above canvas, invisible to Pixi | `new Container()` or `new Graphics()` |
| `element.textContent = 'Score'` | Can't batch with GPU sprites | `new Text({ text: 'Score', style: {...} })` |
| CSS `transition` / `@keyframes` | Runs on CPU, janky on mobile, no scene graph sync | `gsap.to(sprite, { ... })` |
| `element.style.opacity` | Triggers reflow/repaint outside GPU pipeline | `sprite.alpha = 0.5` |
| `element.addEventListener('click')` | Bypasses Pixi event system entirely | `sprite.on('pointertap', fn)` |
| `element.style.transform` | CPU compositor, can't batch | `sprite.scale.set(1.2)` / `sprite.position.set(x, y)` |
| `element.style.backgroundColor` | Not on canvas | `graphics.fill({ color: 0xff0000 })` |
| `element.style.borderRadius` | CSS-only concept | `graphics.roundRect()` or `graphics.circle()` |

**The only exception:** Solid.js screen shells (`src/game/screens/*.tsx`) and the pre-GPU loading screen are DOM. Everything inside `src/game/mygame/` is GPU-only.

---

## 2. Kill Your Animations

Orphaned GSAP tweens are silent memory leaks. They hold references to destroyed sprites, fire callbacks on dead objects, and accumulate until the game stutters.

| Don't | Do instead |
|---|---|
| Let tweens outlive their targets | `gsap.killTweensOf(target)` before destroying the target |
| Forget cleanup in `destroy()` | Kill all active tweens, remove listeners, destroy children |
| Create tweens in a loop without killing old ones | Use `overwrite: 'auto'` or kill before re-tweening |
| Fire-and-forget particle animations | Destroy the particle sprite in `onComplete` |

**Destruction order matters:**
```typescript
// ✅ Correct order
gsap.killTweensOf(sprite);       // 1. Kill tweens first
sprite.parent?.removeChild(sprite); // 2. Remove from scene graph
sprite.destroy({ children: true }); // 3. Destroy the object

// ❌ Wrong — tween fires on destroyed sprite → runtime error
sprite.destroy();
// gsap tween still running → "Cannot read properties of null"
```

---

## 3. Never Use `requestAnimationFrame` for Game Animation

GSAP handles the animation loop. Rolling your own `rAF` loop creates timing conflicts, bypasses GSAP's cleanup, and won't pause when the game pauses.

```typescript
// ❌ Don't
function animate() {
  sprite.x += 1;
  requestAnimationFrame(animate);
}

// ✅ Do
gsap.to(sprite, { x: targetX, duration: 0.5, ease: 'power2.out' });
```

Same goes for `setInterval` and `setTimeout` for animation — use GSAP's `delayedCall()` or timeline delays.

---

## 4. Don't Break the Event Tree

Pixi's event system propagates through the scene graph. One wrong `eventMode` on a parent container silently kills input for every child beneath it.

| Don't | Why it breaks | Do instead |
|---|---|---|
| `parent.eventMode = 'none'` when children are interactive | Kills ALL input for the entire subtree | `parent.eventMode = 'passive'` |
| Forget to set `eventMode` on interactive sprites | Sprite won't receive pointer events | `sprite.eventMode = 'static'` |
| Use `'dynamic'` everywhere "just in case" | Unnecessary overhead — fires `pointermove` constantly | Use `'static'` unless you need move events while not pressed |

**Correct layer setup:**
```typescript
app.stage.eventMode = 'static';
bgLayer.eventMode = 'none';       // no interactive children — safe
gameLayer.eventMode = 'passive';   // HAS interactive children
uiLayer.eventMode = 'passive';     // HAS interactive children
button.eventMode = 'static';      // receives taps
```

---

## 5. Wrong Asset Bundle Prefix = Silent Failure

The bundle prefix determines which loader handles the asset. Using the wrong prefix doesn't throw an error — the asset just never appears.

| Don't | What happens | Do instead |
|---|---|---|
| `theme-gems` for game sprites | DOM loader picks it up — Pixi never sees it | `scene-gems` |
| `boot-*` for in-game assets | Only available during splash, unloaded after | `scene-*` or `core-*` |
| Underscores in bundle names | Fails validation silently | Lowercase + hyphens only: `[a-z][a-z0-9-]*` |

**Prefix → Loader mapping:**
- `scene-*`, `core-*`, `fx-*` → **GPU (Pixi)** — use for game visuals
- `audio-*` → **Howler** — use for sound
- `theme-*`, `boot-*` → **DOM only** — pre-GPU screens only

---

## 6. Don't Create Objects Per Frame

Allocating objects inside `tick()` or render loops causes GC pressure and frame drops, especially on mobile.

```typescript
// ❌ Don't — new object every frame
tick() {
  const pos = { x: this.sprite.x, y: this.sprite.y };
  const color = new Color(0xff0000);
  // ...
}

// ✅ Do — reuse pre-allocated objects
private pos = { x: 0, y: 0 };
tick() {
  this.pos.x = this.sprite.x;
  this.pos.y = this.sprite.y;
}
```

For frequently spawned objects (particles, projectiles, tiles), use **object pooling** — create a fixed pool, recycle on "death" instead of destroying and re-creating.

---

## 7. Don't Use Individual Images

Loading 30 separate PNGs means 30 draw calls, 30 texture binds, and 30 HTTP requests. Use **texture atlases** (spritesheets).

```typescript
// ❌ Don't — individual images
{ name: 'scene-gem-red', assets: [{ src: 'gem-red.png' }] }
{ name: 'scene-gem-blue', assets: [{ src: 'gem-blue.png' }] }

// ✅ Do — single atlas
{ name: 'scene-gems', assets: [{ alias: 'scene-gems', src: 'eigen-gems.json' }] }
const sprite = gpuLoader.createSprite('scene-gems', 'gem_red');
```

---

## 8. Don't Modify `src/core/`

`src/core/` is the scaffold framework managed upstream by `game-components`. Editing it means:
- Your changes get overwritten on the next scaffold update
- You can't merge upstream fixes
- Other games can't benefit from your improvement

If you need something core doesn't provide, that's a `game-components` PR — not a local hack.

---

## 9. Don't Pollute Game State

`step(state, action)` must be a **pure function** — deterministic, no side effects.

| Don't | Why it breaks | Do instead |
|---|---|---|
| `Math.random()` in step | Non-deterministic — breaks replay, testing | Seeded RNG from state |
| Import Pixi in state logic | Couples rendering to logic | Keep state and rendering separate |
| Read DOM or window in step | Side effect — breaks SSR/testing | Pass values in via action payload |
| `let gameState: GameState \| undefined` | Cascading "possibly undefined" everywhere | `let gameState: GameState = createInitialState()` |

---

## 10. Don't Use the Wrong Framework Primitives

This scaffold uses **SolidJS** (not React, not Preact). Using the wrong framework's patterns causes subtle bugs or build failures.

| Don't | Do instead |
|---|---|
| Import from `'react'` or `'preact'` | Import from `'solid-js'` and `'solid-js/web'` |
| Destructure props: `({ score })` | Access as `props.score` (SolidJS tracks property access) |
| Expect components to re-run | Only signal reads in tracking scopes (JSX, `createEffect`) are reactive |
| Use `useState` / `useEffect` | Use `createSignal()` / `createEffect()` |
| Use zustand for state | Use SolidJS signals for cross-screen state |

---

## 11. Don't Use npm/yarn/pnpm

The project uses **bun** exclusively. Mixing package managers creates duplicate lockfiles and dependency resolution conflicts.

| Don't | Do instead |
|---|---|
| `npm install`, `yarn add`, `pnpm add` | `bun add` / `bun install` |
| Commit `package-lock.json` | Only `bun.lock` should exist |
| `npx` | `bunx` |

---

## 12. Don't Navigate to `game_over`

There is no `game_over` screen. The valid screen IDs are: **loading**, **start**, **game**, **results**.

```typescript
// ❌ Don't — screen doesn't exist, fails silently
goto('game_over');

// ✅ Do
goto('results');
```

---

## 13. Don't Use Expensive Pixi Features Carelessly

Some Pixi features are GPU-heavy and will tank mobile performance:

| Feature | Cost | Alternative |
|---|---|---|
| `filters` (blur, glow, etc.) | Very expensive — extra render pass per filter | Pre-bake effects into sprites, or use `tint` + `alpha` |
| `mask` | Extra draw call + stencil buffer | Crop sprites in the atlas, or use `graphics.roundRect()` |
| Deep container nesting | Each level adds transform matrix multiplications | Flatten hierarchy where possible |
| Unbounded particle count | GC pressure + draw calls | Cap at 50–80 concurrent particles |

**Performance budget:**
- Desktop: 60 FPS (16.6ms per frame)
- Modern mobile: 60 FPS (16.6ms)
- Older phones: 30 FPS (33.3ms)

Use `app.ticker.FPS` to monitor. If you're dropping frames, check particle count and filter usage first.

---

## 14. Don't Forget to Unload Assets

Loading level 2's assets without unloading level 1's doubles GPU memory. Textures don't garbage-collect automatically.

```typescript
// ✅ Unload before loading next level
coordinator.unloadBundle('scene-level-1');
await coordinator.loadBundle('scene-level-2');
```

---

## 15. Don't Ship Stubs or Placeholders

Code that reaches the build must be **complete and functional**. Not "technically compiles."

These are not acceptable:
- `// TODO: implement later`
- Empty function bodies
- Colored rectangles standing in for sprites
- Generic variable names (`data`, `thing`, `item`)
- Trivial test data where real level design belongs

If it's not ready, it's not in the build.

---

## 16. One Renderer Per Game — No Mixing

Pick one renderer (Pixi, Phaser, or Three.js) and commit. Mixing renderers in the same game creates competing draw loops, duplicate canvas elements, and unsolvable z-ordering problems.

| Don't | Why it breaks | Do instead |
|---|---|---|
| Import Phaser alongside Pixi | Two animation loops fighting for the same frame budget | Pick one. Pixi for 2D sprites, Phaser for 2D + physics, Three for 3D. |
| Create a second `<canvas>` for custom drawing | Two GPU contexts = doubled memory, no shared textures | Use Pixi's `Graphics` API for custom shapes |
| Switch renderers mid-project | All visual code becomes throwaway | Commit at project kickoff, document in `config.ts` |

The renderer is declared in `src/core/config.ts` (`engine: 'pixi'`). This is set once and never changed.

---

## 17. Don't Touch the Canvas Directly

The renderer owns the `<canvas>` element. Manipulating it via DOM APIs or raw Canvas 2D breaks the rendering pipeline.

| Don't | Why it breaks | Do instead |
|---|---|---|
| `canvas.getContext('2d')` | Conflicts with Pixi's WebGL/WebGPU context | Use `new Graphics()` for shapes |
| `ctx.fillRect()` / `ctx.drawImage()` | Bypasses Pixi's batching, won't composite correctly | Use `Sprite` or `Graphics` |
| `canvas.style.width = '...'` | Overrides Pixi's resolution scaling | Use `app.renderer.resize()` or `resizeTo` |
| `canvas.toDataURL()` during gameplay | Blocks the GPU pipeline, causes frame drops | Use `app.renderer.extract.canvas()` between frames |

Pixi negotiates the best available backend automatically: **WebGPU → WebGL 2 → WebGL 1 → Canvas 2D** fallback. Let it handle the graphics context.

---

## 18. Destroy in the Right Order

Destroying objects out of order causes "cannot read property of null" errors from orphaned references.

```typescript
// ✅ Correct destruction order
function destroyEntity(sprite: Container) {
  // 1. Kill animations (they hold refs to the sprite)
  gsap.killTweensOf(sprite);

  // 2. Remove event listeners
  sprite.removeAllListeners();

  // 3. Remove from scene graph
  sprite.parent?.removeChild(sprite);

  // 4. Destroy the object (and children)
  sprite.destroy({ children: true });
}

// ✅ Correct screen/level teardown
function teardownLevel(container: Container) {
  // 1. Kill ALL tweens on all children
  gsap.killTweensOf(container.children);

  // 2. Destroy the container tree
  container.destroy({ children: true });

  // 3. Unload textures for this level
  coordinator.unloadBundle('scene-level-1');
}
```

**Never** destroy a texture that's still referenced by a sprite. **Never** destroy a sprite that still has active tweens. The order matters.

---

## Quick "Am I About to Break Something?" Checklist

- [ ] Am I creating a DOM element inside `src/game/mygame/`? **Stop.**
- [ ] Am I using CSS transitions for game visuals? **Use GSAP.**
- [ ] Does my `destroy()` kill all tweens and remove all children? **It must.**
- [ ] Did I set a parent container to `eventMode = 'none'` with interactive children? **Use `'passive'`.**
- [ ] Is my asset bundle prefix correct for the loader I need? **Check the table.**
- [ ] Am I editing anything in `src/core/`? **Don't.**
- [ ] Am I using `Math.random()` in game state logic? **Use seeded RNG.**
- [ ] Am I importing from `'react'`? **Use `'solid-js'`.**
- [ ] Am I running `npm install`? **Use `bun`.**
- [ ] Am I creating objects inside `tick()`? **Pre-allocate or pool.**
- [ ] Am I importing a second renderer (Phaser + Pixi)? **Pick one.**
- [ ] Am I calling `canvas.getContext('2d')` directly? **Use Pixi's Graphics API.**
- [ ] Am I destroying sprites before killing their tweens? **Tweens first, then destroy.**
