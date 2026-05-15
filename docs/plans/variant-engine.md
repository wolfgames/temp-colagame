# ClearPop Variant Engine — Execution Plan

> **Read this entire document before touching code.** It encodes architectural decisions already made in a prior brainstorm. Do not re-litigate them; if you find a real conflict, surface it to the user before deviating.

---

## Mission

Turn this single-game repo (Eigen Pop / ClearPop) into a **variant engine** that mass-produces creative ClearPop-genre games from free-form prompts (e.g. "make a spaceship game", "make a sushi game"). Every prompt produces a complete, playable, themed game that is unmistakably the ClearPop genre.

The mechanic stays. Everything else can vary.

## What ClearPop is (the genre kernel)

A ClearPop game is defined by these invariants. **None of them are negotiable across variants.**

1. **Tap → connected group → clear.** Tapping a piece runs flood-fill (BFS) from that cell across same-kind neighbors. The group clears if and only if its size is ≥ 2. The minimum group size is locked at 2 across all variants.
2. **Surviving pieces shift** along a gravity flow the topology defines.
3. **Empty cells refill** from spawn cells the topology defines. Board is always full after a clear.
4. **Score formula:** `10 × groupSize^1.5` (`src/game/clearpop/state/scoring.ts::calcGroupScore`). Identical across all variants so leaderboards remain comparable.
5. **Three power-up slots:** line clear (`rocket`), area clear (`bomb`), color clear (`color_blast`). Spawn thresholds are defined in `src/game/clearpop/state/types.ts:53` as `POWERUP_THRESHOLDS`, currently `{ rocket: ≥5, bomb: ≥7, color_blast: ≥11 }`, consumed in `state/game-logic.ts:126-128`. **Known discrepancy:** `state/powerup-logic.ts:157-162` (`getPowerUpForGroupSize`) hardcodes a parallel set with `bomb: ≥9` instead of 7 — resolve in step 0. Visuals are reskinnable per-theme; spawn thresholds and detonation effects are locked once step 0 resolves the discrepancy.
6. **Tap feedback.** Valid taps fire four channels simultaneously: **visual** (pop + particles), **audio** (pop SFX with pitch scaled to group size), **UI** (score fly-up + goal-counter update), **haptic** (touch vibration on mobile). Invalid taps fire rejection feedback (shake + thud sound) on their own path — required, but distinct from the four valid-tap channels.
7. **Goal type:** "clear all blockers in N moves." Always. Themes rename "blocker" to whatever fits ("astronaut", "crystal", "feeling") — display only, no logic change.
8. **100-level / 10-zone campaign structure** (10 levels per zone). Canonical curve lives in `src/game/clearpop/state/level-configs.ts`; `MAX_LEVEL = 100` confirmed in `src/game/clearpop/debug/level-nav.ts`. Locked.
9. **Animation rhythm.** Phase order: clear → gravity → refill. Specific timings (durations, eases) live in `src/game/clearpop/animations/*.ts` (`pop.ts`, `gravity.ts`, etc.) and are the **canonical source** — do not duplicate values into this document or anywhere else; duplicates drift. Variants inherit these timings unchanged. Path *shape* varies per topology (declared via `topology.gravityPath()` and `topology.refillEntryPath()`); rhythm and timing constants do not vary.

If a variant breaks any of these, it is no longer ClearPop. The translator must never produce a variant that violates them.

## Decisions already made — do not revisit

| Decision | Value |
|---|---|
| Goal type | Always "clear blockers in N moves." Display-renamed by theme. No alternate win-checks. |
| Multi-topology campaigns | Not supported. One topology per variant. |
| Topology library v1 | `rect-orth-down`, `hex-down`, `radial-in` |
| Animations | Path-driven (topology declares waypoints; animator splines through them) |
| Translator behavior | Mood-based topology selection. Explicit prompt cues ("hex", "round", "tunnel", "drain") force a specific topology and override mood. |
| Asset generation | Via `wolf-game-kit` MCP (globally registered). Topology declares its asset shape requirements. |
| Theme freedom | Open-ended (palette, narrative, companion, strings) — generated per-prompt. |
| Topology freedom | Bounded library only. Translator picks; never invents. |
| Recipe freedom | Standard difficulty curve is fixed. Translator fills slots (board size within topology limits, color count, blocker count, moves). |

## Architecture

A `Variant` is the unit of "one game":

```
Variant = Topology + Theme + Recipes
```

### Topology (mechanic shape — bounded library)

A topology declares the *shape* of the playfield. Pure data + small functions. No theming.

```ts
interface Topology {
  id: string;
  cells: CellId[];                              // all cells that exist
  neighbors(cell: CellId): CellId[];            // drives flood-fill
  gravityOrder(): CellId[];                     // iteration order for compaction
  spawnCells: CellId[];                         // where new pieces enter on refill
  cellToScreen(cell: CellId, viewport: Rect): {x: number; y: number};
  gravityPath(from: CellId, to: CellId, viewport: Rect): Waypoint[];
  refillEntryPath(spawn: CellId, target: CellId, viewport: Rect): Waypoint[];

  // Asset-gen contract: tells the asset generator what shape pieces tile in this topology.
  assetSpec: {
    pieceShape: 'square' | 'hex' | 'triangle' | 'circle';
    pieceAspectRatio: number;                   // for non-square pieces
    boardOutline: 'rect' | 'hex' | 'circle' | 'silhouette';
    frameStyle: 'rect' | 'hex' | 'circle';
  };
}
```

Default `gravityPath` and `refillEntryPath` return two-waypoint linear paths. Exotic topologies override with curved/multi-waypoint paths.

### Theme (presentation — open-ended per prompt)

Pure data. No logic. Generated freshly for every prompt.

```ts
interface Theme {
  id: string;
  displayName: string;

  blocks: {
    // 3-color slot system. Mechanic always sees 'a' | 'b' | 'c';
    // theme says what each slot looks like and is called.
    slots: {
      a: { kindName: string; spriteKey: string; tint: string };
      b: { kindName: string; spriteKey: string; tint: string };
      c: { kindName: string; spriteKey: string; tint: string };
    };
  };

  blocker: {
    displayName: string;       // "astronaut", "crystal", "blocker"
    spriteKey: string;
  };

  powerups: {
    line:  { displayName: string; spriteKey: string; vfxKey: string };
    area:  { displayName: string; spriteKey: string; vfxKey: string };
    color: { displayName: string; spriteKey: string; vfxKey: string };
  };

  background: { spriteKey: string; perZone?: Record<number, string> };
  frame:      { spriteKey: string };
  particles:  { popKey: string; refillKey: string; comboKey: string };

  audio: {
    music:    { menuKey: string; gameKey: string };
    sfx:      { popSmallKey: string; popMidKey: string; popLargeKey: string;
                gravityKey: string; refillKey: string; invalidKey: string;
                winKey: string; loseKey: string; powerupTrigger: string };
  };

  companion: {
    name: string;
    spriteKeys: { idle: string; happy: string; sad: string; surprised: string };
    voiceProfile: string;       // for asset-gen audio brief
  };

  zones: ZoneContent[];         // 10 zones, each: name, intro text, level quips
  strings: UIStringPack;        // titles, buttons, HUD labels, win/lose copy
}
```

### Recipes (per-level — parameter-fill)

Already exist (`src/game/clearpop/state/level-configs.ts`). Will be extended to declare the variant's topology id once. Per-level, recipes parameterize: board dims (clamped to topology limits), color count (2–3), blocker count, move budget, power-up settings.

### Translator (prompt → Variant)

```
prompt
  ↓
intent extraction        → vocabulary, mood (calm/chaotic/cute/dark), shape cues, motion cues
  ↓
topology selection       → explicit cues win; else mood-based; else default rect-orth-down
                            mood map (initial heuristic, tunable):
                              calm/grid/orderly       → rect-orth-down
                              organic/natural/cozy    → hex-down
                              chaotic/cosmic/dramatic → radial-in
                            cue overrides:
                              "hex" / "honeycomb"     → hex-down
                              "round" / "circular"    → radial-in
                              "tunnel" / "drain"      → radial-in
                              "grid" / "classic"      → rect-orth-down
  ↓
theme generation         → palette, companion, 10-zone narrative arc, strings, audio brief
  ↓
recipe instantiation     → load standard curve; clamp board size; set topology id
  ↓
asset-gen brief          → topology.assetSpec + theme spec → wolf-game-kit MCP
  ↓
write Variant files      → themes/<name>/ + recipes wiring + variant config
```

When the prompt is wild ("make a 3D first-person shooter"), the translator clamps: pick the closest topology, generate the closest theme, ignore impossible asks. Output is always a valid ClearPop variant.

## Topology library v1

Three topologies. Build all three before declaring step 5 done.

### `rect-orth-down`
- Cells: `WxH` rectangle (default 8x8).
- Neighbors: 4-way orthogonal.
- Gravity: column-wise downward.
- Spawn: top row.
- Paths: linear.
- Asset: square pieces, rect board, rect frame.
- This must reproduce current Eigen Pop exactly.

### `hex-down`
- Cells: pointy-top hex grid in axial coords. Default ~7 columns × 8 rows offset.
- Neighbors: 6-way (NW, NE, E, SE, SW, W in axial terms).
- Gravity: hex-column downward (along the s-axis if pointy-top). Decide and document the precise axis.
- Spawn: top edge of each hex column.
- Paths: linear in axial space → linear on screen.
- Asset: hex pieces (pointy-top), hex board outline, hex frame.

### `radial-in`
- Cells: concentric rings. Default 5 rings, with cell counts e.g. `[1, 6, 12, 18, 24]` (innermost to outermost) — tune for visual density.
- Neighbors: angular (within ring) + radial (between rings). Innermost ring is one cell connected to all of ring 1.
- Gravity: pieces fall *toward center*. After clear, outer pieces shift inward along their angular spoke.
- Spawn: outermost ring.
- Paths: linear toward center; refill enters from outside the outer ring.
- Asset: square or wedge pieces (decide during build), circular board outline, circular frame.

These three are maximally different from each other and each evokes a clear aesthetic family.

---

## Build sequence

Six steps. Each ends with a playable game — no half-broken intermediate states. Run `bun run typecheck` and `bun run dev` after every step.

### Step 0 — Confirm constants (no code)

Read and confirm:
- `src/game/clearpop/state/level-configs.ts` — is this the canonical 200-level / 10-zone difficulty curve? If yes, lock it. If multiple curves exist, ask the user which is canonical before proceeding.
- `src/game/clearpop/state/scoring.ts` — confirm formula is `10 × groupSize^1.5`.
- **Power-up thresholds:** there are two sources in the code today — `state/types.ts:53` (`POWERUP_THRESHOLDS`, used by `state/game-logic.ts:126`) and `state/powerup-logic.ts:157-162` (`getPowerUpForGroupSize`). They disagree on the bomb threshold (7 vs 9). Grep every call site of `getPowerUpForGroupSize`, decide with the user which value is canonical, then make both sources agree (single source of truth). The final agreed values become the locked thresholds.
- **Haptic feedback on valid taps:** confirm whether haptic vibration is currently wired (likely via `navigator.vibrate` or a wrapper around it). If not present, flag to the user — the genre kernel requires it as the fourth valid-tap channel, so it must be added before declaring step 0 done (or the kernel must be amended).
- **Animation timings:** read `animations/pop.ts` and `animations/gravity.ts` and note the durations/eases as the canonical felt-rhythm. Do not transcribe them into other docs; the code is the source.
- Read `CLAUDE.md`, `AGENTS.md`, `docs/standards/best-practices.md`, `docs/standards/guardrails.md` before writing code.

**Done when:** the power-up threshold discrepancy is resolved (one source of truth, agreed value), haptic status is confirmed (present or explicitly added), score formula and curve location are confirmed.

### Step 1 — Define contracts (types only, no logic)

Create:
- `src/game/clearpop/contracts/topology.ts` — `Topology`, `CellId`, `Waypoint`, `AssetSpec` types
- `src/game/clearpop/contracts/theme.ts` — `Theme`, `ZoneContent`, `UIStringPack` types
- `src/game/clearpop/contracts/variant.ts` — `Variant = { topology: Topology; theme: Theme; recipes: Recipe[]; topologyId: string }`
- `src/game/clearpop/contracts/recipe.ts` — extend existing recipe shape; pull current type from `state/types.ts` if it lives there

No game-logic changes yet. Files compile. Game plays identically.

**Done when:** `bun run typecheck` clean, `bun run dev` starts, game plays exactly as before.

### Step 2 — Refactor `state/` to topology-driven

Single biggest structural change. Do it in one focused pass.

- Replace 2D array `board[row][col]` with `Map<CellId, Cell>` (or a flat `Cell[]` indexed by id-position).
- `state/game-logic.ts::findGroup` takes a `neighbors` function as a parameter.
- `state/board-state.ts` gravity logic iterates `topology.gravityOrder()` and uses `topology.spawnCells`.
- `state/obstacle-logic.ts` and `state/level-generator.ts` accept topology where they currently assume rect dimensions.
- Build `src/game/clearpop/topologies/rect-orth-down.ts` that reproduces today's exact behavior. **This is the regression baseline.**
- Update `GameController` to consume `topology` rather than hardcoded rect math.

**Done when:** game plays *identically* — same board, same animations, same feel. If anything is even slightly different, you have a leak in the abstraction. Fix it.

> **Pitfall:** `GameController.ts` is ~1578 lines today. This is a good moment to split it (tap-handling, animation queue, analytics each into their own module). Don't expand the file further.
>
> **Pitfall:** `ClearpopPlugin.ts` has a partial ECS migration (`bridgeEcsToSignals`). Keep the bridge intact; ECS state should track the new cell-id model.

### Step 3 — Topology-aware renderers and path-driven animations

- `src/game/clearpop/renderers/board-renderer.ts` — call `topology.cellToScreen(id, viewport)` for every cell. Drop hardcoded grid math.
- `src/game/clearpop/renderers/block-renderer.ts` and `block-drawing.ts` — read piece-shape from `topology.assetSpec.pieceShape`. For now `rect-orth-down` keeps current square rendering; the abstraction must accommodate hex/circle for later steps.
- `src/game/clearpop/animations/gravity.ts` — accept waypoint paths from `topology.gravityPath(from, to, viewport)`. Default = linear two-waypoint path. Animator splines through waypoints with existing GSAP timing (~200ms per cell-distance). Do NOT change the timing constants.
- `src/game/clearpop/animations/pop.ts` — keep timing; if topology declares a "pop direction" (e.g. radial-in pops inward), use it. Otherwise default outward.
- Refill animation reads `topology.refillEntryPath`.

**Done when:** game plays identically with the same visual feel; under the hood, all positions and paths come through topology.

### Step 4 — Extract Theme Pack

- Create `src/game/clearpop/themes/eigenpop/` and move into it everything currently theme-y:
  - `content/zones.ts` → `themes/eigenpop/zones.ts`
  - `content/ui-strings.ts` → `themes/eigenpop/strings.ts`
  - `content/recipes.ts` → keep recipes in `state/` (they're parameter data, not theme), but theme references them by id
  - Sprite asset paths from `renderers/sprite-assets.ts` → `themes/eigenpop/assets.ts`
  - `audio/` sound definitions → `themes/eigenpop/audio.ts`
  - `ui/TalkingHeads*` companion content → `themes/eigenpop/companion.ts`
- `GameController` signature changes to `createGameController(deps, variant: Variant)`. Stop importing `./content/*` directly.
- Block color → kind/sprite/tint comes from `theme.blocks.slots`.
- All UI strings come from `theme.strings`.
- The audio manager (`src/game/audio/manager.ts`) accepts a sound bank reference rather than hardcoding clips.

**Done when:** game plays identically. The word "eigenpop" appears in `themes/eigenpop/` and nowhere else in the game directory. Removing the theme pack and pointing the variant at a stub theme should produce a game that runs but looks/sounds wrong — proving the decoupling works.

> **Pitfall:** Two parallel UI implementations exist in `clearpop/ui/` (e.g. `Interstitial.ts` + `Interstitial-pixi.ts`). Confirm which is canonical with the user before extracting; do not move both blindly.

### Step 5 — Build hex-down + radial-in + a second theme

- `src/game/clearpop/topologies/hex-down.ts` — full implementation per spec above.
- `src/game/clearpop/topologies/radial-in.ts` — full implementation per spec above.
- Both must implement the full `Topology` interface, including `assetSpec`.
- Build a stub second theme (`themes/_devtest/`) with placeholder assets to validate the theme abstraction handles real divergence (different palette, different companion, different strings).
- Add a build-time switch to select the active variant (env var `VITE_VARIANT=eigenpop|hex-test|radial-test` or similar).
- Tune as needed: if level recipes don't transfer cleanly, adjust the parameter-fill (board size limits per topology). Do **not** alter the difficulty curve itself.

**Done when:** all three topologies are playable end-to-end. Each produces a tunable, fair, fun game on the standard curve. Animation paths look correct (hex pieces fall along axial direction; radial pieces fall toward center).

> **Pitfall:** Hex axial coords + screen layout can drift. Visually verify pieces tile without gaps before declaring done.
>
> **Pitfall:** Radial-in needs care around the innermost cell (it has many neighbors). Decide and document whether ring 0 is one cell or empty.

### Step 6 — Prompt translator skill

- Add a skill in `aidd-custom/` (per project convention from `AGENTS.md`). Name it something like `make-variant`.
- Skill takes a free-form prompt, produces:
  1. Topology selection (mood + cue heuristic above; emit the chosen id and the reasoning)
  2. Theme spec (palette, companion archetype, narrative arc, strings, audio brief, sprite briefs)
  3. Recipe instantiation (load standard curve, clamp board size to topology limits, set topology id)
  4. Asset-gen calls via `wolf-game-kit` MCP, using `topology.assetSpec` to brief shape requirements
  5. Files written into `src/game/clearpop/themes/<slug>/`
  6. A `variants/<slug>.ts` config that wires topology + theme + recipes
- Skill must produce a runnable variant on `bun run dev` with the variant env var.
- Failure mode: if the prompt is incoherent or asks for impossible mechanics, clamp to the closest valid variant and note what was discarded in the skill output.

**Done when:** running the skill on three sample prompts ("make a spaceship game", "make a sushi game", "make a game about feelings") produces three playable, distinct, mechanically-sound ClearPop variants.

---

## Validation gates (run between every step)

```bash
bun run typecheck     # no errors introduced
bun run test:run      # existing tests still pass
bun run dev           # game still loads, plays, completes a level
```

If any gate fails, fix before moving on. Do not stack changes on a broken base.

## Pitfalls and prior context

- **Don't touch `src/core/`** — read-only for this work. The variant engine lives entirely under `src/game/clearpop/`. If you find yourself needing a core change, surface it to the user; almost always there's a way around it.
- **Asset gen MCP** is registered globally (per user memory). Use it; don't build a local pipeline.
- **`@wolfgames/*` packages** require a GitHub token (`NODE_AUTH_TOKEN`). Assume it's already configured.
- **GameController is too big.** Split during step 2 refactor; don't grow it.
- **ECS migration is partial** (`ClearpopPlugin.ts` bridges ECS to signals). Keep the bridge; the cell-id refactor flows through ECS.
- **`pipeline/` directory** has uncommitted deletions on this branch (per `git status`). Ignore unless the user says otherwise.
- **Locked CSS keyframes / animation timings.** Per `CLAUDE.md` LOCKED contract, animation timing constants do not change. Path *shape* changes; rhythm does not.
- **`key={piece.id}` not position.** Existing repo discipline. Maintain it after refactor.
- **Pieces fill 100% of cell.** No 85% shrinks. Maintain canvas real estate.
- **No DOM in GPU code.** Per guardrails. The Pixi rendering layer stays Pixi-only.

## Glossary

- **Flood-fill** — BFS from the tapped cell across same-kind neighbors, returning the connected group. Generic over neighbor rule; implemented once in `state/game-logic.ts`.
- **Topology** — the cell set, neighbor rule, gravity direction, refill source, and screen-positioning math for one variant. Bounded library; never invented per-prompt.
- **Theme** — the visual/audio/narrative skin for one variant. Open-ended; generated per-prompt.
- **Variant** — one complete game = topology + theme + recipes.
- **Recipe** — per-level parameters (board size, color count, blockers, moves). Driven by the standard difficulty curve.
- **Translator** — the skill that maps a free-form prompt to a Variant by selecting topology, generating theme, and instantiating recipes.
- **Locked / Adaptable** — terms from `CLAUDE.md`. Locked things never change across variants; adaptable things vary at marked points.

## Open questions to surface to the user before step 5

These don't block steps 0–4, but get answers before committing to step 5 specifics:

1. **Hex orientation:** pointy-top vs flat-top? (Pointy-top shipped in v1; reopen if flat-top is desired.)
2. **Radial-in cell counts per ring:** confirmed `[1, 6, 12, 18, 24]` for v1.
3. **Variant selection at runtime:** env var `VITE_VARIANT` shipped in v1.
4. **Asset-gen MCP brief format:** the skill translates `topology.assetSpec` + theme spec into MCP prompts; the MCP doesn't accept a structured assetSpec hint directly.

---

## Deferred work (post-v1 — picks up after the six-step build)

The six-step build delivered topology-driven kernel, theme-pack extraction, three topology modules, a stub theme, a `VITE_VARIANT` switch, and the `make-variant` skill. The following work is **deferred** and must land before `hex-down` / `radial-in` variants are playable end-to-end. Each item is scoped so it can be tackled independently.

### D1 — BoardState storage refactor (foundation for hex/radial)

**Problem.** `BoardState.cells: BoardCell[][]` is a 2-D rect array indexed by `[row][col]`. Hex (axial coords) and radial (ring/idx) cell ids don't map onto rect rows/cols, so non-rect topologies can't store their boards in this shape.

**Approach.** Replace `cells: BoardCell[][]` with `cellsById: Map<CellId, BoardCell>` (or a flat `BoardCell[]` indexed by topology.cells position). Keep `cols`/`rows` only on rect storage for legacy rect callers, or move them onto a topology-specific extension.

**Surface area (count from git).** 76 `cells[r][c]` access sites across 21 files (`state/`, `state/level-gen/passes/*`, `ClearpopPlugin.ts`, `GameController.ts`, `renderers/board-renderer.ts`). Use `getCellById` / `setCellById` (already exist in `state/board-state.ts`) as the new access pattern; remove all direct `cells[r][c]` indexing.

**Gate.** `bun run typecheck` clean; all 21 clearpop tests pass; rect game plays identically.

### D2 — Level generation per topology (rect-specific passes → topology-aware or per-topology)

**Problem.** `src/game/clearpop/state/level-gen/passes/` contains rect-specific passes: `mirror-symmetry.ts` (mirrors left half to right half), `place-bottom-blocker-zone.ts` (bottom N rows), `build-pocket-mask.ts`, `random-mask.ts` (cols × rows grid). None of these translate to hex or radial coordinate systems.

**Approach options.**
1. **Per-topology generator** — each topology declares its own `generateLevel(config, topology)` strategy. Rect keeps the current pipeline; hex/radial get topology-appropriate generators.
2. **Generic pipeline** — passes iterate `topology.cells` and use `topology.neighbors` for adjacency-based placement. Mirror symmetry, blocker zones, pocket masks each need a hex/radial reinterpretation.

Recommend option 1 (cleaner separation, less likely to silently break rect). Build new generators in `src/game/clearpop/topologies/<id>/level-gen.ts` and route `generateLevel(config, topology)` to the right one.

**Gate.** A hex board and a radial board both populate with blocks, obstacles, and at least one valid group of size ≥ 2.

### D3 — Renderer generalisation for non-rect topologies

**Problem.** `BoardRenderer` already consults `topology.cellToScreen` for cell positions, but it still assumes a rect-shaped container (`computeLayout` uses `cols × rows`, `screenToGrid` floor-divides by step, `drawBackground` is a rounded rect, `highlightGroups` builds a `cells[r][c]` mask).

**Approach.**
- `computeLayout` takes a topology and returns the bounding rect of `topology.cells` after layout.
- `screenToGrid` is replaced by `screenToCellId(localX, localY)` — for non-rect topologies, it picks the cell whose `cellToScreen` is closest to the pointer.
- `validMask` becomes `Map<CellId, boolean>`.
- Piece shape (`square` / `hex` / `circle`) comes from `topology.assetSpec.pieceShape`; `block-renderer.ts` and `block-drawing.ts` switch rendering primitive accordingly.

**Gate.** A blank hex board renders with pieces tiling without gaps; a blank radial board renders rings centred on the viewport; tap → flood-fill highlights the correct cells in both.

### D4 — GameController consumes `variant.theme`

**Problem.** `GameController.ts` still imports zones/strings/recipes directly from `themes/eigenpop/*`. Swapping themes requires changing imports.

**Approach.** Change `createGameController(deps)` → `createGameController(deps, variant: Variant)`. Replace every `import { ... } from './themes/eigenpop/...'` with reads from `variant.theme.zones`, `variant.theme.strings`, etc. The translator-emitted variants then plug in without source edits.

**Gate.** Removing `themes/eigenpop/` entirely and pointing the variant at the `_devtest` stub produces a game that runs but looks/sounds wrong (proving the decoupling works), and the word `eigenpop` appears only inside `themes/eigenpop/`.

### D5 — Audio manager takes a sound bank

**Problem.** `src/game/audio/manager.ts` hardcodes clip references. Themes can't customise audio without touching the manager.

**Approach.** Manager API takes a sound bank descriptor matching `Theme.audio`. Theme keys (`popSmallKey`, `gameKey`, etc.) resolve to the variant's audio clips via the asset coordinator.

**Gate.** Switching `VITE_VARIANT` swaps menu music, game music, and at least one SFX without code changes.

### D6 — Translator skill executes end-to-end on three sample prompts

**Problem.** `aidd-custom/skills/make-variant/SKILL.md` documents the pipeline but hasn't been run against the three canonical sample prompts (spaceship, sushi, feelings). Until D1–D4 land, only `rect-orth-down` translations are testable.

**Gate.** Running the skill on each of the three prompts yields three playable, distinct variants on `bun run dev`.

### Ordering

`D1 → D3 → D2` is the natural chain (storage must move first; renderer needs storage; generator needs both). `D4` and `D5` can land in parallel any time after D1. `D6` is the final integration test and unblocks declaring the engine production-ready.

### What's already in place (don't redo)

- Topology contract (incl. `gravityChains`), `rect-orth-down` / `hex-down` / `radial-in` modules.
- Theme contract with theme-agnostic `ZoneContent` / `UIStringPack`; `eigenpopTheme` and `devtestTheme`.
- Kernel functions (`findGroup`, `applyGravity`, `refillBoard`, `resolveAdjacencyClear`, `hasValidGroups`) consume `Topology` for control flow.
- `BoardRenderer.gridToScreen` and animations resolve positions through topology.
- `variants/index.ts` registry + `VITE_VARIANT` switch.
- `make-variant` skill document.
