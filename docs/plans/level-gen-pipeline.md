# Level Generation Pipeline — Architecture Plan

Refactor the monolithic `level-generator.ts` into a composable pipeline of independent passes. Integrates the pocket-first mask builder, enables adding new blockers and mechanics without modifying existing passes, and closes the gap between vision rules and implementation.

---

## Problem Statement

The current level generator has four structural issues:

1. **Monolithic pipeline** — `buildBoardFromMask` hardcodes every step. Adding ice/jelly/cage/safe means editing a single growing function.
2. **Dead blocker path** — `obstacle-logic.ts` exports `placeObstacles()` but `level-generator.ts` never calls it. Only `bubble_block` and `egg` are placed at generation time.
3. **Weak mask builder** — `pocket-styles.ts` generates ad-hoc pockets with random scatter. The pocket-first algorithm (explicit dimension tables, vertical-axis mirroring, solo-gem rejection, blocker fraction enforcement) is better and should replace it.
4. **Missing validation rules** — the vision specifies 7 bubble structure rules (cohesion, top-entry bias, perimeter gems, etc.). Only coverage and exposure are implemented.

---

## Design: Pipeline of Composable Passes

Level generation becomes a sequence of independent **passes** operating on a shared context. Each pass takes a context and returns it (modified) or `null` to reject the attempt. New mechanics = new pass files, zero changes to existing passes.

### Core Types

```typescript
interface LevelGenContext {
  config: LevelGenConfig;
  rng: SeededRNG;
  mask: CellMask[][] | null;
  board: BoardState;
  metadata: Map<string, unknown>;
}

type LevelGenPass = (ctx: LevelGenContext) => LevelGenContext | null;
```

- **`config`** — read-only level parameters (level ID, dimensions, color count, obstacle types, seed).
- **`rng`** — seeded PRNG, advanced by each pass deterministically.
- **`mask`** — set by the mask pass (`'bubble' | 'gem'` grid), consumed by bubble placement.
- **`board`** — the BoardState being constructed, mutated by each pass in sequence.
- **`metadata`** — cross-pass communication. E.g. the mask pass stashes pocket bounds so blocker passes can read them.

### Pipeline Runner

```typescript
function runPipeline(
  passes: LevelGenPass[],
  config: LevelGenConfig,
  maxAttempts: number,
): BoardState | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createSeededRNG(config.seed + attempt * 1337);
    let ctx: LevelGenContext | null = {
      config,
      rng,
      mask: null,
      board: createEmptyBoard(config.cols, config.rows),
      metadata: new Map(),
    };

    for (const pass of passes) {
      ctx = pass(ctx);
      if (!ctx) break;  // pass rejected → retry with new seed
    }

    if (ctx) return ctx.board;
  }
  return null;
}
```

### Pass Assembly

```typescript
function buildPassList(config: LevelGenConfig): LevelGenPass[] {
  const passes: LevelGenPass[] = [
    buildPocketMask,     // Step 1: generate symmetric bubble/gem mask
    placeBubbles,        // Step 2: mask → bubble_block obstacle cells
    colorGems,           // Step 3: horizontal band coloring + max group enforcement
    mirrorSymmetry,      // Step 4: left→right gem color mirror
  ];

  // Blocker decoration passes — conditionally added per level
  if (config.obstacleTypes.includes('egg'))   passes.push(placeEggs);
  if (config.obstacleTypes.includes('ice'))   passes.push(placeIce);
  if (config.obstacleTypes.includes('jelly')) passes.push(placeJelly);
  if (config.obstacleTypes.includes('cage'))  passes.push(placeCages);
  if (config.obstacleTypes.includes('safe'))  passes.push(placeSafes);

  passes.push(validateBoard);  // Final gate — reject bad boards
  return passes;
}
```

---

## File Structure

```
src/game/clearpop/state/level-gen/
├── index.ts                    # generateLevel() — assembles pipeline, runs with fallbacks
├── types.ts                    # LevelGenContext, LevelGenPass, LevelGenConfig
├── pipeline.ts                 # runPipeline() — retry loop executing passes
│
├── passes/
│   ├── build-pocket-mask.ts    # Pass 1: pocket-first algorithm → bubble/gem mask
│   ├── place-bubbles.ts        # Pass 2: mask cells → bubble_block obstacles
│   ├── color-gems.ts           # Pass 3: horizontal bands + max group enforcement
│   ├── mirror-symmetry.ts      # Pass 4: left→right gem color mirror
│   ├── place-eggs.ts           # Pass 5: bubble→egg row-pattern conversion (L4+)
│   ├── place-ice.ts            # Pass 6: ice overlay on gem cells (L12+)
│   ├── place-jelly.ts          # Pass 7: jelly overlay on gem cells (L20+)
│   ├── place-cages.ts          # Pass 8: cage overlay on gem cells (L32+)
│   ├── place-safes.ts          # Pass 9: safe replacing bubbles (L44+)
│   └── validate-board.ts       # Final: reject boards that fail hard rules
│
├── mask/
│   ├── pocket-mask.ts          # Pocket-first symmetric mask builder
│   ├── random-mask.ts          # Fallback: random scatter mask
│   └── mask-validation.ts      # 7-rule bubble structure validation
│
└── util/
    └── flood-fill.ts           # Shared flood-fill, solo-gem check, neighbor helpers
```

### What Stays, What Moves

| Current file | Action |
|---|---|
| `level-generator.ts` | Replaced by `level-gen/index.ts` + `pipeline.ts` + passes. Old file becomes a thin re-export for backwards compat. |
| `pocket-styles.ts` | Replaced by `level-gen/mask/pocket-mask.ts` (the new pocket-first algorithm). Old file deleted. |
| `obstacle-logic.ts` | Kept as-is for runtime damage resolution. Blocker passes import `createObstacle` from it. |
| `level-configs.ts` | Kept as-is. `generateLevel` still calls `getLevelConfig`. |
| `board-state.ts` | Kept as-is. Passes use `createEmptyBoard`, `getCell`, etc. |
| `seeded-rng.ts` | Kept as-is. The new pocket-first algorithm adapts to `SeededRNG` (no new `Rng` type). |
| `types.ts` | Kept. `LevelGenConfig` moves to `level-gen/types.ts`; re-exported from old location. |

---

## Pocket-First Mask Builder

The new mask builder replaces the ad-hoc pocket generation with an explicit algorithm:

1. **Pocket dimension table** — 15 allowed rectangle sizes from 1×3 to 8×4.
2. **Left-half carving** — pick a random shape that fits the left half, carve it as gem cells.
3. **Vertical-axis mirror** — reflect the left half onto the right half.
4. **Solo-gem rejection** — any gem cell with zero orthogonal gem neighbors invalidates the mask.
5. **Blocker fraction enforcement** — at least 50% of cells must remain as bubbles.
6. **Retry loop** — up to 48 attempts per seed.

The existing `SeededRNG.nextInt(min, max)` replaces the `randomInt(rng, min, max)` call convention from the standalone algorithm. No new RNG interface needed.

---

## Blocker Placement Strategy

Each blocker pass selects eligible cells, applies a **budget** (fraction of eligible cells scaled by zone difficulty), and places obstacles using `createObstacle` from `obstacle-logic.ts`.

| Blocker | Eligible cells | Placement logic | Budget scaling |
|---|---|---|---|
| `bubble_block` | All mask `'bubble'` cells | Direct from mask (always present) | N/A — determined by mask |
| `egg` | Existing `bubble_block` cells on target rows | Row-pattern rotation `(levelId - 1) % 4` | Fixed per pattern |
| `ice` | Gem cells near pocket boundaries | Random selection from boundary-adjacent gems | 5–15% of gem cells, increases with zone |
| `jelly` | Gem cells in bottom half | Prefer clusters of 2–4 cells | 5–12% of gem cells |
| `cage` | Isolated gem cells (few gem neighbors) | Target gems that would otherwise be easy pops | 3–8% of gem cells |
| `safe` | Existing `bubble_block` cells in mass center | Replace bubbles farthest from gem interface | 3–10% of bubble cells |

### Budget Formula

```
budget = baseFraction + (positionInZone / ZONE_SIZE) * scaleFraction
```

Where `baseFraction` and `scaleFraction` are per-blocker-type constants. This creates a smooth difficulty ramp within each zone without hand-tuning 200 levels.

### Metadata for Cross-Pass Coordination

The mask pass writes to `metadata`:
- `pocketBounds: { col, row, w, h }` — the left-half pocket rectangle
- `gemBoundaryCells: GridPos[]` — gem cells orthogonally adjacent to at least one bubble
- `bubbleMassCenter: GridPos` — centroid of the bubble cluster

Blocker passes read these to make informed placement decisions. For example, `place-ice` targets `gemBoundaryCells`; `place-safes` targets cells near `bubbleMassCenter`.

---

## Validation Rules

### Mask Validation (7 rules from vision)

| Rule | Constraint | Current impl | Gap |
|---|---|---|---|
| Coverage | 60–85% bubbles | 40–85% | Tighten lower bound |
| Exposure | 10–25% of bubbles touch a gem | ≥ 8% | Add upper bound, raise lower |
| Cohesion | 70%+ bubbles in one connected component | Not implemented | Add BFS connected component check |
| No small clusters | No isolated bubble groups < 5 cells (before L16) | Not implemented | Add |
| Checkerboard cap | Max 3 checkerboard 2×2 windows | Not implemented | Add |
| No solo gems | Zero gem cells with no gem neighbor | Implemented in final validation | Move to mask validation too |
| Top-entry bias | 55%+ of interface gems in top half | Not implemented | Add |
| Perimeter gems | 50%+ of gems on board edge | Not implemented | Add |

### Final Board Validation

After all passes, reject boards where:
- Fewer than `MIN_INITIAL_GEM_CELLS` (8) playable blocks
- No valid group of size ≥ 2 exists
- Any block cell has zero block neighbors (solo gem)
- Any blocker type in `config.obstacleTypes` has zero instances on the board

---

## Fallback Strategy

```
generateLevel(config):
  1. Try pocket-first pipeline (32 attempts)
  2. Try random-mask pipeline (40 attempts, looser validation)
  3. Last-resort board (top 3 rows bubbles, rest random blocks)
```

Each tier uses the same pipeline runner with different mask passes and validation thresholds. The last-resort board bypasses the pipeline entirely — it's a guaranteed-safe board that never crashes.

---

## DDA Integration Point

Dynamic Difficulty Adjustment inserts a pass before validation:

```typescript
if (ddaActive) {
  passes.splice(passes.indexOf(validateBoard), 0, ddaRelaxBoard);
}
```

`ddaRelaxBoard` can:
- Merge small isolated bubble clusters into the main mass (easier attack surface)
- Recolor gems to create larger natural groups
- Reduce blocker budgets by 30%

The player never sees this — the board just "happens" to be friendlier.

---

## Future Mechanics — Extension Examples

### New blocker: "Chain"
1. Create `passes/place-chains.ts`
2. Add `'chain'` to `ObstacleType` union in `types.ts`
3. Register in `OBSTACLE_INTRO_LEVEL` in `obstacle-logic.ts`
4. Add chain placement logic (e.g. pairs of cells linked by a chain — clear one to free the other)
5. Add to `buildPassList` conditional: `if (config.obstacleTypes.includes('chain')) passes.push(placeChains);`
6. Zero changes to existing passes, mask builder, or pipeline runner

### New mechanic: "Full-board horizontal band"
1. Create `mask/band-mask.ts` — a new mask strategy that carves a full-width gem band
2. Add as an alternative mask pass for specific level ranges
3. The rest of the pipeline (coloring, mirroring, blockers, validation) works unchanged

### New mechanic: "Pre-placed power-up"
1. Create `passes/place-initial-powerups.ts`
2. Insert after `colorGems`, before blocker passes
3. Converts specific gem cells into `PowerUpCell` entries

---

## Migration Checklist

- [ ] Create `src/game/clearpop/state/level-gen/` directory structure
- [ ] Extract `LevelGenConfig` to `level-gen/types.ts`, re-export from `types.ts`
- [ ] Implement `pipeline.ts` with `runPipeline`
- [ ] Port existing `generatePocketMask` → `mask/pocket-mask.ts` using the new pocket-first algorithm
- [ ] Port existing `buildRandomBubbleMask` → `mask/random-mask.ts`
- [ ] Port existing `validateMaskStructure` → `mask/mask-validation.ts`, add missing rules
- [ ] Extract `floodFill` → `util/flood-fill.ts`
- [ ] Create pass files by extracting from `level-generator.ts`:
  - `build-pocket-mask.ts` (mask generation + validation)
  - `place-bubbles.ts` (mask → obstacle cells)
  - `color-gems.ts` (horizontal bands + max group)
  - `mirror-symmetry.ts` (left→right mirror)
  - `place-eggs.ts` (egg row conversion)
  - `validate-board.ts` (final checks)
- [ ] Create new blocker placement passes:
  - `place-ice.ts`
  - `place-jelly.ts`
  - `place-cages.ts`
  - `place-safes.ts`
- [ ] Wire `level-gen/index.ts` as the new `generateLevel` entry point
- [ ] Update `level-generator.ts` to re-export from `level-gen/index.ts` (backwards compat)
- [ ] Run existing tests — `no-empty-cells.test.ts` must pass
- [ ] Add per-pass unit tests
