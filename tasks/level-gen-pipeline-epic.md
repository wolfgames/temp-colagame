# Level Generation Pipeline Epic

**Status**: ✅ COMPLETED (2026-04-08)
**Goal**: Refactor level generation into a composable pass pipeline that supports adding new blockers and mechanics without modifying existing code.

## Overview

The current level generator is a monolithic function chain that only places bubble_block and egg obstacles. Ice, jelly, cage, and safe are defined in types but never generated. Adding any new mechanic requires editing `buildBoardFromMask` directly. This epic restructures generation into independent passes operating on a shared context, integrates the pocket-first mask algorithm, implements the missing vision validation rules, and wires up the four unimplemented blocker placement passes.

---

## Scaffold Pipeline Infrastructure

Create the `level-gen/` directory with core types (`LevelGenContext`, `LevelGenPass`) and the `runPipeline` retry-loop runner.

**Requirements**:
- Given the pipeline types, should define `LevelGenContext` with config, rng, mask, board, and metadata fields
- Given `runPipeline` receives passes and a config, should retry with incremented seed on `null` return from any pass
- Given all passes succeed, should return the final `BoardState`

---

## Extract Shared Utilities

Move `floodFill` and neighbor-checking helpers out of `level-generator.ts` into `level-gen/util/flood-fill.ts` so all passes can import them.

**Requirements**:
- Given `floodFill` is called from multiple passes, should be importable from `level-gen/util/flood-fill.ts`
- Given `countSoloGemCells` helper, should be co-located in the same util file

---

## Implement Pocket-First Mask Builder

Replace `pocket-styles.ts` with the new pocket-first algorithm in `level-gen/mask/pocket-mask.ts` — explicit dimension table, left-half carving, vertical-axis mirror, solo-gem rejection, blocker fraction enforcement.

**Requirements**:
- Given a pocket dimension table of 15 sizes, should only pick shapes that fit the left half
- Given a carved mask, should mirror the left half across the vertical axis
- Given any gem cell with zero orthogonal gem neighbors, should reject the mask
- Given the final mask, should enforce at least 50% blocker fraction
- Given the existing `SeededRNG` interface, should not introduce a new RNG type

---

## Port Random Mask Fallback

Move `buildRandomBubbleMask` to `level-gen/mask/random-mask.ts`.

**Requirements**:
- Given pocket-first fails, should provide a random scatter mask with configurable coverage

---

## Implement Full Mask Validation

Create `level-gen/mask/mask-validation.ts` with all 7 vision rules: coverage 60–85%, exposure 10–25%, cohesion 70%+, no small clusters, checkerboard cap, no solo gems, top-entry bias, perimeter gems.

**Requirements**:
- Given a mask, should reject when bubble coverage is outside 60–85%
- Given a mask, should reject when fewer than 70% of bubbles are in the largest connected component
- Given a mask before level 16, should reject isolated bubble groups smaller than 5 cells
- Given a mask, should reject when more than 3 checkerboard 2×2 windows exist
- Given a mask, should reject when fewer than 55% of interface gems are in the top half
- Given a mask, should reject when fewer than 50% of gems are on the board perimeter

---

## Create Core Passes — Mask, Bubbles, Color, Mirror

Extract existing logic from `level-generator.ts` into four pass files: `build-pocket-mask.ts`, `place-bubbles.ts`, `color-gems.ts`, `mirror-symmetry.ts`.

**Requirements**:
- Given `build-pocket-mask` pass, should set `ctx.mask` and write pocket bounds to `ctx.metadata`
- Given `place-bubbles` pass, should convert mask `'bubble'` cells to `bubble_block` obstacles and `'gem'` cells to `empty`
- Given `color-gems` pass, should fill empty cells with horizontal band colors and enforce max group size of 6
- Given `mirror-symmetry` pass, should copy left-half gem colors to the right half

---

## Create Egg Placement Pass

Extract `applyEggRowPattern` into `passes/place-eggs.ts`.

**Requirements**:
- Given level ID >= 4 and `'egg'` in obstacle types, should convert some bubble_block cells to eggs using the rotating row pattern
- Given level ID < 4, should be a no-op (not added to pass list)

---

## Create Ice Placement Pass

Implement `passes/place-ice.ts` — overlay ice on gem cells near pocket boundaries.

**Requirements**:
- Given level ID >= 12 and `'ice'` in obstacle types, should overlay ice on a budget of 5–15% of gem cells
- Given a gem cell selected for ice, should create an obstacle with `trappedBlock` preserving the original block
- Given the budget, should scale with position in zone (harder = more ice)

---

## Create Jelly Placement Pass

Implement `passes/place-jelly.ts` — overlay jelly preferring bottom-half gem cells.

**Requirements**:
- Given level ID >= 20 and `'jelly'` in obstacle types, should overlay jelly on 5–12% of gem cells
- Given placement preference, should favor cells in the bottom half of the board
- Given a gem cell selected for jelly, should create an obstacle with `trappedBlock`

---

## Create Cage Placement Pass

Implement `passes/place-cages.ts` — cage isolated gem cells.

**Requirements**:
- Given level ID >= 32 and `'cage'` in obstacle types, should cage 3–8% of gem cells
- Given placement preference, should target gems with fewer gem neighbors (harder to free)
- Given a gem cell selected for cage, should create an obstacle with `trappedBlock`

---

## Create Safe Placement Pass

Implement `passes/place-safes.ts` — replace bubble_block cells near mass center with safes.

**Requirements**:
- Given level ID >= 44 and `'safe'` in obstacle types, should replace 3–10% of bubble cells with safes
- Given placement preference, should target bubbles farthest from the gem interface

---

## Create Final Validation Pass

Extract `validateFinalBoard` into `passes/validate-board.ts` with additional checks.

**Requirements**:
- Given fewer than 8 playable block cells, should reject
- Given no valid group of size >= 2, should reject
- Given any block cell with zero block neighbors, should reject
- Given any obstacle type in config with zero instances on board, should reject

---

## Wire Pipeline Entry Point and Fallbacks

Create `level-gen/index.ts` that assembles passes via `buildPassList`, runs pocket-first pipeline, falls back to random-mask pipeline, then last-resort board. Update `level-generator.ts` to re-export.

**Requirements**:
- Given `generateLevel(config)`, should return a valid `BoardState` matching the existing contract
- Given pocket-first fails after 32 attempts, should fall back to random-mask pipeline with 40 attempts
- Given both pipelines fail, should return a last-resort board
- Given the existing test imports from `level-generator.ts`, should continue working via re-export

---

## Verify Existing Tests Pass

Run the `no-empty-cells.test.ts` suite and fix any regressions.

**Requirements**:
- Given levels 1–20, should generate boards with zero empty cells
- Given a clear→gravity→refill cycle, should maintain zero empty cells
- Given level 1 initial board, should have only block or obstacle cells

---

## Juice — No Scale Conflict Before Pop

**Requirements**:
- Given a group of gems is cleared, juice should not apply a scalePunch that compounds with the pop animation's back.in anticipation
- Given a bubble_block obstacle is cleared by adjacency, juice should not apply a scalePunch on a sprite that has no follow-up pop animation

---

## Egg Crack Animation — No Scale Conflict

**Requirements**:
- Given an egg obstacle is cracked (HP 2 → 1), the crack animation should wobble and emit shell particles without applying a scalePunch that conflicts with the pivot-shifted wobble
- Given the egg wobble uses a bottom-shifted pivot for the rocking motion, no concurrent scale animation should run on the same sprite

---

## Gravity Resilience After Pipeline Refactor

Ensure gravity / collapse still works correctly after the level-gen pipeline refactor and that level generation never silently breaks the game.

**Requirements**:
- Given any generated board (levels 1–20), after clearing a valid group, gravity should produce at least one movement when empty cells exist below non-obstacle cells
- Given `generateLevel` throws at runtime, `startLevel` should catch the error and fall back to a simple working board instead of leaving the game in a broken state
