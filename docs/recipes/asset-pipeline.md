# Asset Pipeline Guide

How to create, export, and organize assets for games built on this scaffold.

## Overview

The asset system uses a 3-stage loading pipeline:
1. **DOM** - Fonts, CSS (handled automatically)
2. **GPU** - Textures, sprite atlases (Pixi/WebGL)
3. **Audio** - Sound effects, music (Howler.js)

## Sprite Atlases (TexturePacker)

### Export Settings

Use these TexturePacker settings for Pixi.js compatibility:

| Setting | Value |
|---------|-------|
| Data Format | JSON (Hash) |
| Texture Format | PNG |
| Max Size | 2048 x 2048 (or 4096 for retina) |
| Algorithm | MaxRects |
| Trim Mode | Trim |
| Extrude | 1px (prevents bleeding) |

### Naming Conventions

```
public/assets/
├── tiles_citylines_v1.json      # Atlas metadata
├── tiles_citylines_v1.png       # Atlas texture
├── tiles_citylines_v1_fall.json # Theme variant
├── tiles_citylines_v1_fall.png
└── vfx-rotate.json              # VFX atlas
```

**Atlas naming pattern:** `{category}_{gamename}_{version}[_{variant}].json`

**Sprite naming in atlas:**
- Use descriptive names: `road_straight.png`, `landmark_hospital.png`
- Animation frames: `character_walk_01.png`, `character_walk_02.png`
- UI elements: `button.png`, `dialogue.png`, `progress_bar.png`

### Registering in Manifest

```typescript
// src/game/asset-manifest.ts
export const manifest: Manifest = {
  cdnBase: '/assets',
  bundles: [
    // Theme-specific tiles (only one loaded based on tuning)
    { name: 'tiles_citylines_v1', assets: ['tiles_citylines_v1.json'] },
    { name: 'tiles_citylines_v1_fall', assets: ['tiles_citylines_v1_fall.json'] },

    // VFX bundles
    { name: 'vfx-rotate', assets: ['vfx-rotate.json'] },
  ],
};
```

### Loading in Code

```typescript
// Load bundle
await coordinator.loadBundle('tiles_citylines_v1');

// Get loader and check if ready
const gpuLoader = coordinator.getGpuLoader() as PixiLoader;
if (gpuLoader.hasSheet('tiles_citylines_v1')) {
  // Create sprite
  const sprite = gpuLoader.createSprite('tiles_citylines_v1', 'road_straight.png');

  // Or get texture directly
  const texture = gpuLoader.getTexture('tiles_citylines_v1', 'landmark_hospital.png');
}
```

## 9-Slice Sprites

For UI elements that need to scale without distorting corners (buttons, panels, dialogue boxes):

### Asset Preparation

1. Design with clear corner regions that shouldn't stretch
2. Export as single sprite in atlas
3. Note the border sizes (left, top, right, bottom)

### Usage

```typescript
import { NineSliceSprite } from 'pixi.js';

const texture = gpuLoader.getTexture(atlasName, 'button.png');
const button = new NineSliceSprite({
  texture,
  leftWidth: 32,
  topHeight: 32,
  rightWidth: 32,
  bottomHeight: 32,
});
button.width = 200;  // Scales center, preserves corners
button.height = 80;
```

## Fonts

The template ships with several pre-registered fonts. Before adding a new one, check [available-assets.md](../guides/available-assets.md#fonts) — you may already have what you need.

**To switch fonts**, import from `src/game/fonts.ts` and assign in `config.ts`:

```ts
import { FONT_CHEWY } from './fonts';
export const GAME_FONT_FAMILY = FONT_CHEWY;
```

### Adding a New Font

1. Place `.ttf`/`.woff2` in `public/assets/fonts/`:
   ```
   public/assets/fonts/MyFont-Regular.ttf
   ```

2. Register in CSS (`src/app.css`):
   ```css
   @font-face {
     font-family: 'MyFont';
     src: url('/assets/fonts/MyFont-Regular.ttf') format('truetype');
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   ```

3. Export a constant (`src/game/fonts.ts`):
   ```typescript
   export const FONT_MYFONT = 'MyFont, system-ui, sans-serif';
   ```

4. Use in Pixi Text:
   ```typescript
   import { GAME_FONT_FAMILY } from '~/game/config';

   const text = new Text({
     text: 'Hello',
     style: { fontFamily: GAME_FONT_FAMILY, fontSize: 24 }
   });
   ```

## Bundle Naming Conventions

The asset system infers loading stage from bundle name prefixes:

| Prefix | Stage | Description |
|--------|-------|-------------|
| `boot-` | Boot | Minimal assets for loading screen |
| `core-` | Core | Required before gameplay |
| `scene-` | Scene | Scene-specific assets |
| `audio-` | Audio | Sound effects and music |
| `theme-` | Theme | Branding, logos |
| `vfx-` | VFX | Visual effects |
| `tiles_` | Tiles | Game tile atlases |

## Theme Variants

For seasonal or themed asset swaps:

```typescript
// tuning/types.ts
export type TileTheme = 'regular' | 'fall' | 'winter';

// Get bundle name based on theme
export function getTileBundleName(theme: TileTheme): string {
  const variants: Record<TileTheme, string> = {
    regular: 'tiles_citylines_v1',
    fall: 'tiles_citylines_v1_fall',
    winter: 'tiles_citylines_v1_winter',
  };
  return variants[theme];
}

// Usage
const tileTheme = tuning.game.theme.tileTheme;
const bundleName = getTileBundleName(tileTheme);
await coordinator.loadBundle(bundleName);
```

## Best Practices

1. **Organize by feature** - Group related sprites in the same atlas
2. **Optimize texture size** - Use power-of-2 dimensions when possible
3. **Trim transparent pixels** - Reduces memory usage
4. **Use mipmaps** - For sprites that scale significantly
5. **Separate large assets** - Keep animated sprites in dedicated atlases
6. **Version your atlases** - Include version in filename for cache busting

## Troubleshooting

### "Texture not found"
- Check sprite name matches exactly (case-sensitive)
- Verify bundle was loaded before accessing
- Check `hasSheet()` returns true

### "Atlas not loading"
- Verify JSON and PNG have matching names
- Check file exists in `public/assets/`
- Look for CORS errors in console

### "Sprites bleeding"
- Increase extrude in TexturePacker to 2px
- Ensure no half-pixel positions in sprite placement
