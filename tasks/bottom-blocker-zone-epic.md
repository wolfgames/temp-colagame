# Bottom Blocker Zone Layout Epic

**Status**: ✅ COMPLETED (2026-05-07)
**Goal**: Add a declarative per-level "bottom blocker zone" that fills the lower N rows with clean rectangular obstacle patterns, living entirely in `LevelConfig`.

## Overview

Players clearing all-gem boards eventually hit a difficulty plateau — there's no spatial variety in where the challenge lives. This adds a new layout mode where the bottom rows are pre-filled with structured obstacle arrangements (solid fills, inlaid rectangles) declared directly in `LevelConfig`, so the pipeline can execute them deterministically. The top portion of the board stays fully normal. No existing level is touched — the field is optional and all current logic passes through unchanged.

---

## Define `BottomBlockerZoneConfig` Type

Add the declarative spec type to `src/game/clearpop/state/types.ts` and wire the optional field into both `LevelConfig` and `LevelGenConfig`.

**Requirements**:
- Given `BottomBlockerZoneConfig`, should have a `rows` field (number of rows from bottom to fill)
- Given `BottomBlockerZoneConfig`, should have a `fill` field with a single `ObstacleType` that covers the entire zone
- Given `BottomBlockerZoneConfig`, should have an optional `overlays` array where each entry is `{ type: ObstacleType; rowOffset: number; rowCount: number; colOffset: number; colCount: number }` (row 0 = bottom of the zone)
- Given `LevelConfig` and `LevelGenConfig`, should each gain an optional `bottomBlockerZone?: BottomBlockerZoneConfig` field
- Given undefined `bottomBlockerZone`, should leave all existing behavior completely unchanged

---

## Create `place-bottom-blocker-zone` Pass

Implement `src/game/clearpop/state/level-gen/passes/place-bottom-blocker-zone.ts` as a `LevelGenPass` that reads `config.bottomBlockerZone` and overwrites the bottom rows.

**Requirements**:
- Given `config.bottomBlockerZone` is undefined, should return `ctx` unchanged (no-op)
- Given a `fill` type and `rows` count, should overwrite ALL cells in the bottom N rows with that obstacle at full HP — every cell becomes a clearable obstacle, no empties
- Given `overlays`, should apply each as a rectangular stamp of the specified type on top of the base fill using only the left half of the board (col < cols/2), so `mirrorSymmetryPass` mirrors them for free
- Given an overlay rectangle that extends beyond the zone bounds or the left half width, should return `null` (pipeline retries)
- Given all zone cells are obstacles, should count toward the win condition obstacle total — no unclearable structural cells exist in this game

---

## Inject Pass into Pipeline

Wire the new pass into `buildPocketPassList` and `buildRandomPassList` in `src/game/clearpop/state/level-gen/index.ts`.

**Requirements**:
- Given `config.bottomBlockerZone` is set, should insert `placeBottomBlockerZonePass` after `colorGemsPass` and before obstacle scatter passes
- Given the pass position, should run before `mirrorSymmetryPass` so overlay shapes are mirrored left↔right (if overlay is on left half only)
- Given both pocket-first and random-mask pipelines, should include the pass in both

---

## Assign Zone Configs to Levels

Update `src/game/clearpop/state/level-configs.ts` to assign `bottomBlockerZone` specs to a selection of levels.

**Requirements**:
- Given zone 3+ levels (level 21+), should be eligible for bottom blocker zone assignment
- Given every 5th level in a zone (positions 4 and 9 in the zone), should receive a `bottomBlockerZone` config
- Given zone position 4, should use a simple solid fill (2 rows, one obstacle type from the zone theme)
- Given zone position 9 (zone climax), should use a fill + inlay combo (3 rows base fill, a 3×2 inlay of the accent type centered horizontally)
- Given any assigned level, the `rows` count should scale with zone depth: zone 3–5 = 2 rows, zone 6–8 = 3–4 rows, zone 9–10 = 5–6 rows (always leaving at least 2 rows of normal gem play above)
- Given a 6-row blocker zone on an 8-row board, only 2 rows remain for gem play — this is intentional for the hardest levels

---
