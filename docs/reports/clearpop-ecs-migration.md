# ClearPop ECS Migration Report

**Goal:** Create `clearpop-eda-ecs` branch, port the ECS infrastructure from the `ecs-inspector` branch, and convert ClearPop's game state to use `@adobe/data/ecs`.

---

## What ClearPop Is

A tap-to-clear puzzle game (Toy Blast / Cookie Jam style). 8x8 grid, tap groups of same-colored blocks to pop them. 6 obstacle types, 3 power-ups, combo system, 30-move limit per level. Pixi.js rendering, GSAP animations, full juice/VFX layer.

## Current Architecture

```
User Tap
  → GameController (orchestrator)
    → Pure functions (board-state.ts, game-logic.ts, powerup-logic.ts)
      → Returns new BoardState + events
    → Update SolidJS signals (score, moves, stars)
    → Sync Pixi renderers (board-renderer, block-renderer, hud-renderer)
    → Fire GSAP animations (pop, gravity, detonation)
    → Queue juice events (particles, screen shake, flash)
    → Check win/lose
```

**State lives in three places:**
1. **SolidJS signals** (`state.ts`) — score, moves, level, lives, coins
2. **Immutable BoardState** (closure in GameController) — the 8x8 grid of cells
3. **Phase flag** (closure variable) — idle, animating, won, lost

**No ECS.** No `@adobe/data`. Pure functions + signals + Pixi renderers.

---

## What Needs to Be Ported from `ecs-inspector`

### Infrastructure (copy from ecs-inspector → clearpop-eda-ecs)

| File | What it does |
|------|-------------|
| `src/core/systems/ecs/index.ts` | Barrel export: Database, Store, Entity, Vec2, F32, Observe, activeDb, setActiveDb |
| `src/core/systems/ecs/DbBridge.ts` | SolidJS signal bridge for Inspector |
| `src/core/systems/ecs/ExamplePlugin.ts` | Canonical example (reference only) |
| `src/core/dev/inspector/Inspector.tsx` | Inspector panel UI |
| `src/core/dev/inspector/Overlay.tsx` | Entity position overlay |
| `src/core/dev/inspector/bridge.ts` | Reads entities/resources/systems from any Database |
| `src/core/dev/inspector/styles.ts` | Inspector panel CSS-in-JS |
| `src/core/dev/inspector/index.ts` | Barrel |
| `src/app.tsx` | Wire Inspector with `<Show when={activeDb()}>` |
| `package.json` | Add `@adobe/data: ^0.9.45` dependency |

**Total:** ~1,122 lines of infrastructure code. All in `src/core/` — none touches game code.

---

## The Conversion: Three Approaches

### Approach A: ECS as Observation Layer (Smallest change)

Keep all game logic as-is. Add an ECS Database that mirrors the board state for the Inspector. Same pattern we used in PuzzleBox.

**What changes:**
- Create `src/game/clearpop/clearpop-plugin.ts` — define components for block, obstacle, power-up, empty
- After each move in GameController, call `syncEcs()` to rebuild entities from BoardState
- `setActiveDb(db)` on game start, `setActiveDb(null)` on destroy

**What stays the same:**
- All pure game logic (board-state.ts, game-logic.ts, etc.)
- All renderers (board-renderer, block-renderer, etc.)
- All animations and juice
- SolidJS signals for score/moves/level

**Effort:** Low. ~150 lines of new code. One new file + small GameController changes.

**Trade-off:** ECS is just a mirror — not the source of truth. Inspector works but you're maintaining two copies of state.

---

### Approach B: ECS as Game State (Medium change)

Replace BoardState and SolidJS signals with ECS entities and resources. Game logic reads/writes through transactions. Renderers sync from ECS queries.

**What changes:**

**Plugin definition:**
```
Components:
  position: Vec2     — grid [col, row]
  pixelPos: Vec2     — screen [x, y]
  blockColor: string — 'purple' | 'red' | 'orange'
  obstacleType: string — 'bubble_block' | 'egg' | 'ice' | ...
  obstacleHp: F32
  powerUpType: string — 'rocket' | 'bomb' | 'color_burst'
  spriteKey: string  — Inspector display name
  active: boolean    — whether cell is occupied

Resources:
  score: number
  movesRemaining: number
  level: number
  phase: string      — 'idle' | 'animating' | 'won' | 'lost'
  blockerCount: number
  gameName: string

Archetypes:
  Block: [position, pixelPos, blockColor, active, spriteKey]
  Obstacle: [position, pixelPos, obstacleType, obstacleHp, active, spriteKey]
  PowerUp: [position, pixelPos, powerUpType, blockColor, active, spriteKey]
  EmptyCell: [position, active]
```

**Game logic refactor:**
- `findGroup()` → transaction that queries entities by `blockColor` + adjacency
- `clearGroup()` → transaction that deletes/deactivates entities
- `applyGravity()` → transaction that updates `position` components
- `refillBoard()` → transaction that inserts new Block entities
- `detonateRocket()` → transaction that queries row/column entities

**Renderer refactor:**
- BoardRenderer reads from `db.select(['position', 'pixelPos', 'blockColor'])` instead of `BoardState.cells[][]`
- Could use `Database.observeSelectDeep()` to reactively sync sprites

**Signals removed:**
- `score`, `movesRemaining`, `level`, `phase`, `blockerCount` all become ECS resources
- UI reads from `db.observe.resources.score` instead of `gameState.score()`

**What stays the same:**
- GSAP animations (still promise-based, triggered after transactions)
- Juice/VFX system (reads events from transactions, not from signals)
- Level generation (produces initial entity set instead of BoardState)
- Pixi rendering layer (sprites, textures, layers)

**Effort:** Medium-high. Refactor game-logic.ts, powerup-logic.ts, obstacle-logic.ts to work with entities instead of `BoardState`. Rewrite GameController orchestration. Update renderers to query ECS. ~1,000-1,500 lines changed.

**Trade-off:** ECS is the source of truth. Inspector shows real game state. Undo/redo comes free. But pure functions become transactions (less portable, harder to test in isolation).

---

## Note on GSAP

GSAP stays regardless of approach. ECS manages state (what entities exist, their data). GSAP manages animation (tweening sprite properties over time). They do different jobs. Adobe's own Pixie example uses ECS for state and external rendering — ECS doesn't replace your animation library.

---

## Recommendation

**Start with Approach A**, then migrate toward B incrementally.

Approach A gets the Inspector working with ~150 lines of new code and zero risk to existing gameplay. You can see every cell entity in the Inspector, verify state, and debug visually.

Then migrate individual systems to ECS transactions one at a time:
1. First: move `score`, `moves`, `level` to ECS resources (easiest)
2. Then: move board state to ECS entities (medium — biggest refactor)
3. Then: move renderers to read from ECS queries (follows naturally from #2)

Each step is independently shippable. The game works at every stage.

---

## Steps to Create the Branch

```bash
# Create branch from clearpop-eda
git checkout clearpop-eda
git checkout -b clearpop-eda-ecs

# Cherry-pick ECS infrastructure from ecs-inspector
# (or manually copy the core/ files + update package.json)
git checkout ecs-inspector -- src/core/systems/ecs/
git checkout ecs-inspector -- src/core/dev/inspector/

# Add @adobe/data dependency
# (manually add to package.json, then bun install)

# Update app.tsx to wire Inspector
# (add activeDb import, Show wrapper)

# Create clearpop-plugin.ts with game-specific components
# Wire setActiveDb in GameController
# Add syncEcs() call after each move

# Test
bun install
bun run typecheck
bun run dev
```

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Core file conflicts when merging | ECS files are all new (no existing files modified except app.tsx) |
| `@adobe/data` version mismatch | Pin to same version as ecs-inspector (^0.9.45) |
| Inspector breaks Pixi rendering | Inspector is DOM overlay, separate from Pixi canvas |
| Performance with 64 entities | Trivial — ECS handles thousands of entities |
| Breaking existing tests | Approach A changes no game logic — tests stay green |
