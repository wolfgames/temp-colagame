/**
 * Asset manifest — single source for bundle list and paths.
 *
 * This file is intentionally free of runtime imports (no Solid.js, no ~/core)
 * so it can be imported by CLI scripts (scripts/check-manifest.ts) running
 * under plain Bun without the Vite/app dependency graph.
 *
 * cdnBase and localBase are static placeholders here. config.ts resolves the
 * real CDN URL at runtime and patches cdnBase before handing to the asset system.
 *
 * Types are imported directly from @wolfgames/components/core — this is the
 * single source of truth for the manifest schema.
 *
 * Bundle naming determines which loader handles the assets:
 *
 *   boot-*   → DOM only   — splash screen assets
 *   theme-*  → DOM only   — branding/logo (loading screen, pre-GPU)
 *   scene-*  → GPU (Pixi) — game spritesheets, backgrounds, tiles, characters
 *   core-*   → GPU (Pixi) — in-game UI atlases
 *   fx-*     → GPU (Pixi) — particles, effects, VFX spritesheets
 *   audio-*  → Howler     — sound effects, music
 *
 * Game atlases MUST use scene-* or core-* to be accessible via Pixi
 * (createSprite, getTexture, hasSheet). Using theme-* for game atlases
 * will silently fail — Pixi never sees them.
 *
 * Bundle names must match [a-z][a-z0-9-]* — only lowercase, digits, hyphens.
 * NO underscores. Asset file paths can have underscores; bundle names cannot.
 *
 * For single-asset GPU bundles, set alias = bundle name so Pixi lookups work:
 *   { name: 'scene-tiles', assets: [{ alias: 'scene-tiles', src: 'atlas-tiles.json' }] }
 *   → gpuLoader.createSprite('scene-tiles', 'frame-name.png')
 */

import type { Manifest } from '@wolfgames/components/core';

export const LOCAL_ASSET_PATH = '/assets';

export const manifest: Manifest = {
  cdnBase: LOCAL_ASSET_PATH,
  localBase: LOCAL_ASSET_PATH,
  bundles: [
    // DOM — branding logo shown on loading screen (pre-GPU)
    {
      name: 'theme-branding',
      assets: [{ alias: 'atlas-branding-wolf', src: 'atlas-branding-wolf.json' }],
    },

    // Audio — SFX sprite (Howler)
    {
      name: 'audio-sfx-clearpop',
      assets: [{ alias: 'audio-sfx-clearpop', src: 'sfx-clearpop.json' }],
    },

    // Audio — background music
    {
      name: 'audio-music-clearpop',
      assets: [{ alias: 'audio-music-clearpop', src: 'music-clearpop.json' }],
    },

    // Per-variant audio bundles. Each non-eigenpop variant that ships its
    // own audio assets registers a bundle here so loadAudio() (which loads
    // every audio-* bundle) picks them up. Themes route gameplay events to
    // these channels through `Theme.audio.bundles` + per-event SoundRef.
  ],
};
