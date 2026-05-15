# SpriteButton

Interactive button primitive with hover, press, and exit animations. Ships with three renderer backends that share the same defaults and tuning.

## Architecture

```
sprite-button/
  index.ts              ← barrel exports (all renderers + shared config)
  defaults.ts           ← animation & style constants
  tuning.ts             ← Tweakpane schema for live editing
  renderers/
    pixi.ts             ← Pixi.js  (default)
    phaser.ts           ← Phaser 3
    three.ts            ← Three.js
```

```
                    ┌──────────────────────┐
                    │     defaults.ts      │
                    │  pressScale, hover,  │
                    │  easing, label style │
                    └─────────┬────────────┘
                              │ shared by all
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │   Pixi.js     │   │   Phaser 3    │   │   Three.js    │
  │───────────────│   │───────────────│   │───────────────│
  │ Container     │   │ GO.Container  │   │ THREE.Group   │
  │ Sprite /      │   │ Sprite /      │   │ PlaneGeometry │
  │ NineSlice     │   │ NineSlice     │   │ + Texture     │
  │ Text          │   │ Text          │   │ CanvasTexture │
  │───────────────│   │───────────────│   │───────────────│
  │ Built-in      │   │ setInteract-  │   │ External      │
  │ pointer       │   │ ive() pointer │   │ raycast       │
  │ events        │   │ events        │   │ events        │
  └───────────────┘   └───────────────┘   └───────────────┘
        GSAP                GSAP                GSAP
```

## Usage

### Pixi.js (default)

```ts
import { SpriteButton } from '~/modules/primitives/sprite-button';

const btn = new SpriteButton(gpuLoader, {
  atlasName: 'ui',
  spriteName: 'btn-play',
  label: 'Play',
  onClick: () => startGame(),
});
stage.addChild(btn);
```

### Phaser 3

```ts
import { PhaserSpriteButton } from '~/modules/primitives/sprite-button';

const btn = new PhaserSpriteButton(this, 400, 300, {
  textureKey: 'ui',
  frameName: 'btn-play',
  label: 'Play',
  onClick: () => this.scene.start('Game'),
});
```

### Three.js

```ts
import { ThreeSpriteButton } from '~/modules/primitives/sprite-button';

const btn = new ThreeSpriteButton({
  texture: myTexture,
  label: 'Play',
  width: 2,
  height: 0.6,
  onClick: () => startGame(),
});
scene.add(btn);

// Wire pointer events from your raycast loop
btn.handlePointerOver();
btn.handlePointerDown();
btn.handlePointerUp();
btn.handlePointerOut();
```

## Public API (all renderers)

| Method | Description |
|--------|-------------|
| `playExitAnimation()` | Scale down + fade out. Returns a `Promise<void>`. |
| `setEnabled(bool)` | Toggle interactivity and visual opacity. |
| `setLabel(text)` | Update the label string at runtime. |
| `destroy()` / `dispose()` | Tear down listeners, kill GSAP tweens, free GPU resources. |

## Tuning

All animation values are extracted to `defaults.ts` and exposed via `tuning.ts` for the Tweakpane dev panel:

| Parameter | Default | Range |
|-----------|---------|-------|
| `hoverScale` | 1.05 | 1.0 – 1.3 |
| `pressScale` | 0.95 | 0.7 – 1.0 |
| `pressDuration` | 0.1s | 0 – 0.5 |
| `hoverDuration` | 0.2s | 0 – 0.5 |
| `exitScale` | 0.9 | 0.5 – 1.0 |
| `exitDuration` | 0.25s | 0 – 1.0 |
| `disabledAlpha` | 0.5 | 0 – 1 |
