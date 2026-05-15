# Cleanup — Migrated & Dead Code

Code that has been migrated to `@wolfgames/components` or is no longer used.
Review before deleting — some exports may be consumed by game-specific code not yet checked in.

---

## Safe to Delete

These files have zero imports in the codebase.

| File | What it was | Replaced by |
|------|-------------|-------------|
| `core/ui/MobileViewport.tsx` | Mobile constraint wrapper component | `MobileViewport` from `@wolfgames/components/solid` |
| `core/config/viewport.ts` | Constants, URL parsing, grid helpers | `@wolfgames/components/core` viewport system |

### `core/config/viewport.ts` — breakdown

| Export | Status | Replacement |
|--------|--------|-------------|
| `getViewportModeFromUrl()` | **Migrated** — amino already imports from `@wolfgames/components/core` | `getViewportModeFromUrl` from `@wolfgames/components/core` |
| `VIEWPORT_MIN_WIDTH` | Dead | Pass as `smallMaxWidth` to `createViewportCore()` |
| `VIEWPORT_MIN_HEIGHT` | Dead | Derived from aspect ratio + min width |
| `ASPECT_RATIO` | Dead | Pass as `aspectRatio` to `createViewportCore()` |
| `SAFE_PADDING` | Dead | Pass as `padding` to `calculateMaxGridSize()` |
| `MIN_TOUCH_TARGET` | Dead | `MIN_TOUCH_TARGET` from `@wolfgames/components/core` |
| `VIEWPORT_CONSTRAINTS` | Dead | No direct replacement — use factory options |
| `calculateMaxGridSize()` | Dead | `calculateMaxGridSize()` from `@wolfgames/components/core` (options object API) |
| `calculateTileSize()` | Dead | `calculateTileSize()` from `@wolfgames/components/core` |

### `core/ui/MobileViewport.tsx`

Exported from `core/index.ts` (line 18) but never imported. Remove the export too:
```
export { MobileViewport } from './ui/MobileViewport';
```

---

## Re-exports to Clean Up

These local type definitions now re-export from game-components. They work fine but could be simplified.

| File | Export | Source |
|------|--------|--------|
| `core/systems/tuning/types.ts` | `ViewportMode`, `ViewportConfig` | Re-exported from `@wolfgames/components/core` |

**Note:** `ScaffoldTuning.viewport` still uses `ViewportConfig`, so the re-export must stay until the tuning system itself is migrated.

---

## Config Index Export

`core/config/index.ts` re-exports `getViewportModeFromUrl` from the local `viewport.ts`. Once `viewport.ts` is deleted, remove this line:
```
export { getViewportModeFromUrl } from './viewport';
```
The app already imports directly from `@wolfgames/components/core`.

---

## Not Yet Migrated — Local Systems Still in Amino

These systems have game-components equivalents but amino still uses its own implementations. Migration is tracked separately per-ticket.

| Amino System | game-components Equivalent | Notes |
|--------------|---------------------------|-------|
| `systems/pause/` | `@wolfgames/components/solid` PauseProvider | Amino wraps with `initPauseKeyboard()` |
| `systems/audio/` | `@wolfgames/components/solid` AudioProvider | Amino adds game-specific audio helpers |
| `systems/screens/` | `@wolfgames/components/solid` ScreenProvider | Amino has custom screen wiring |
| `systems/manifest/` | `@wolfgames/components/solid` ManifestProvider | Already partially consumed |
| `systems/analytics/` | `@wolfgames/components/solid` AnalyticsProvider | Amino adds game-specific tracking |

## Amino-Only Systems (No Migration Planned)

| System | Purpose |
|--------|---------|
| `systems/tuning/` | Dev tuning panel + localStorage persistence |
| `systems/feature-flags/` | PostHog feature flag integration |
| `systems/vfx/` | Game-specific visual effects |
| `systems/errors/` | Custom error boundary |
| `systems/assets/` | Facade wrapping game-components loaders |
