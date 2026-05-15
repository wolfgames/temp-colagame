# Modules Index

Reusable building blocks + assembled prefabs. Can import from `core/`. Never imports from `game/`.

## Primitives

Single-purpose, configurable components. No deps on other modules.

| Module | What it does | Path |
|--------|-------------|------|
| sprite-button | Pressable sprite with hover/press animations | primitives/sprite-button/ |
| dialogue-box | 9-slice speech bubble with text rendering | primitives/dialogue-box/ |
| character-sprite | Animated character from texture atlas | primitives/character-sprite/ |
| progress-bar | Segmented progress with milestone markers | primitives/progress-bar/ |

## Logic

Pure logic, no rendering. Factory functions configured by game code.

| Module | What it does | Path |
|--------|-------------|------|
| level-completion | State machine: playing → completing → complete | logic/level-completion/ |
| progress | Save/load progress backed by localStorage | logic/progress/ |
| catalog | Ordered content catalog with navigation | logic/catalog/ |
| loader | Fetch + transform content pipeline | logic/loader/ |

## Prefabs

Assembled from primitives + logic. Higher-level building blocks.

| Module | What it does | Path |
|--------|-------------|------|
| avatar-popup | Circular avatar + dialogue + show/dismiss | prefabs/avatar-popup/ |

## Module Structure

Every module follows this shape:

```
modules/<category>/<module-name>/
  index.ts          ← public API (barrel export)
  defaults.ts       ← extracted magic numbers
  tuning.ts         ← panel schema for Tweakpane
  renderers/        ← renderer-specific implementations (visual modules only)
    pixi.ts           ← Pixi.js implementation
```

Logic modules use factory functions instead of renderers:

```
modules/logic/<module-name>/
  index.ts          ← factory function + types + public API
  defaults.ts       ← default config values
  tuning.ts         ← panel schema for Tweakpane
```

## Where to put new modules

- Single-purpose visual component → `primitives/`
- Pure logic, no rendering → `logic/`
- Assembles multiple primitives → `prefabs/`
- Reusable across games? It belongs here. Game-specific? It goes in `game/`.
