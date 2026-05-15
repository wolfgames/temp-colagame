# ClearPop ECS Integration Report

**Branch:** `clearpop-eda-ecs`
**Date:** 2026-04-10

---

## What Was Done

Ported the ECS infrastructure from the `ECS` branch into ClearPop and wired the game's board state to the Inspector panel. This is Approach A from the migration report — ECS as an observation layer, zero changes to game logic.

### Files Ported from ECS Branch

| File | Purpose |
|------|---------|
| `src/core/systems/ecs/DbBridge.ts` | SolidJS signal bridge for Inspector |
| `src/core/systems/ecs/ExamplePlugin.ts` | Canonical ECS plugin example |
| `src/core/systems/ecs/index.ts` | Barrel re-exports (Database, Vec2, F32, setActiveDb) |
| `src/core/dev/inspector/*` | Full Inspector panel UI |
| `src/app.tsx` | Inspector wired to bridge signal |
| `ai/skills/aidd-ecs/*` | Updated skill docs |
| `docs/reports/ecs-*.md`, `reactive-ecs.md`, `inspector-panel.md` | ECS documentation |
| `@adobe/data@^0.9.45` | New dependency |

### New ClearPop Files

| File | Purpose |
|------|---------|
| `src/game/clearpop/clearpop-plugin.ts` | ECS plugin + `syncBoardToEcs()` helper |

### Modified ClearPop Files

| File | Change |
|------|--------|
| `src/game/clearpop/GameController.ts` | Create DB on init, `syncEcs()` after each move, clear on destroy |

---

## How State Management Works

ClearPop has three layers of state, each serving a different purpose:

### Layer 1: SolidJS Signals — UI State

```
src/game/state.ts
```

Global signals that drive the DOM screens (loading, start, results) and the in-game HUD:

```
score          → HUD score display, results screen
level          → HUD level display, level config lookup
movesRemaining → HUD moves counter, lose condition check
starsEarned    → HUD star display, results screen
blockerCount   → Win condition check (0 blockers = level won)
currentLevelConfig → Level parameters (grid size, colors, moves, obstacles)
coins, lives   → Meta-progression (not used in core gameplay yet)
```

These are SolidJS `createSignal()` values created in a `createRoot()` so they survive screen transitions. The HUD renderer reads them. The results screen reads them. They persist across the loading → start → game → results screen flow.

**Why signals:** The scaffold's screen system is SolidJS. DOM screens need reactive data. Signals are the natural fit for cross-screen state that drives UI.

### Layer 2: BoardState — Game Logic State

```
Closure variable in GameController: let board: BoardState | null
```

The 8x8 grid of cells. This is where the actual puzzle state lives:

```typescript
interface BoardState {
  cells: BoardCell[][];  // 8x8 grid
  cols: number;          // 8
  rows: number;          // 8
}
```

Each cell is one of:
- `BlockCell` — colored block (purple, red, orange)
- `ObstacleCell` — barrier with HP (bubble, egg, ice, jelly, cage, safe)
- `PowerUpCell` — rocket, bomb, or color burst
- `EmptyCell` — gap (gravity fills these)

**BoardState is immutable.** Every game operation returns a new board:

```
tap → findGroup(board) → clearGroup(board) → new board
    → applyGravity(board) → new board
    → refillBoard(board) → new board
```

Pure functions, no mutations, deterministic (seeded RNG). This is why the game logic is trivial to test — every function is `(BoardState, args) → { board: BoardState, ...metadata }`.

**Why closure variable:** Board state changes many times per move (clear, gravity, refill). It doesn't need to be reactive — nothing subscribes to individual cell changes. The renderer syncs from it explicitly after animations complete. Signals would add overhead with zero benefit.

### Layer 3: ECS Database — Inspector Observation

```
Closure variable in GameController: let ecsDb: ClearpopDatabase | null
```

A `@adobe/data/ecs` Database that mirrors the board state for the dev Inspector panel. Every non-empty cell becomes an ECS entity:

```
Block    → entity with: position, gridPos, cellKind='block', blockColor
Obstacle → entity with: position, gridPos, cellKind='obstacle', obstacleType, obstacleHp, hasTrap
PowerUp  → entity with: position, gridPos, cellKind='powerup', powerUpType, blockColor
```

Resources mirror the global state:
```
score, movesRemaining, level, phase, blockerCount
```

**Sync pattern:** After each move completes (tap or powerup detonation), `syncEcs()` runs:

```
1. db.transactions.clearAll()     — delete all entities
2. Loop over board.cells[][]      — re-insert from current grid
3. db.transactions.syncResources  — update score, moves, phase, etc.
```

This runs after animations finish, after the board renderer syncs, after the HUD updates — it's the last step. The Inspector polls at 2fps, so it picks up the new state on the next refresh.

**Why observation layer:** The game logic is already pure and working. Rewriting it to use ECS transactions would add complexity without benefit. The Inspector just needs to see the current state — it doesn't need to observe individual mutations in real time. The clear-and-rebuild pattern is simple, correct, and adds ~5ms per move for a 64-cell grid.

---

## Data Flow

```
User Tap
  │
  ▼
GameController.onBoardPointerTap()
  │
  ├─ findGroup(board, pos)         ← pure function
  ├─ clearGroup(board, group)      ← pure function → new board
  ├─ applyGravity(board)           ← pure function → new board
  ├─ refillBoard(board, rng)       ← pure function → new board
  │
  ├─ gameState.addScore(n)         ← SolidJS signal update
  ├─ gameState.decrementMoves()    ← SolidJS signal update
  ├─ gameState.setBlockerCount(n)  ← SolidJS signal update
  │
  ├─ boardRenderer.syncBoard()     ← Pixi sprite sync
  ├─ hudRenderer.update()          ← Pixi HUD sync
  │
  ├─ animatePop()                  ← GSAP tweens (async)
  ├─ animateGravity()              ← GSAP tweens (async)
  ├─ animateRefill()               ← GSAP tweens (async)
  │
  ├─ fireJuice([events])           ← particles, screen shake
  │
  └─ syncEcs()                     ← ECS entity rebuild for Inspector
```

Each layer has a clear responsibility:
- **Pure functions** produce the next board state
- **SolidJS signals** notify the DOM/HUD of score and progress changes
- **Pixi renderers** sync sprites to match the new board
- **GSAP** animates the visual transitions
- **Juice** fires feedback effects
- **ECS** mirrors the final state for dev tooling

---

## What Could Change Next (Approach B)

If we later want ECS as the source of truth instead of an observation layer:

1. **Move score/moves/level from SolidJS signals to ECS resources** — UI would read from `db.observe.resources.score` instead of `gameState.score()`. Eliminates the signal layer for game state.

2. **Move BoardState into ECS entities** — each cell becomes a persistent entity. `clearGroup` becomes a transaction that deletes entities. `applyGravity` becomes a transaction that updates `gridPos` components. No more clear-and-rebuild sync.

3. **Renderers read from ECS queries** — `boardRenderer` would use `db.select(['gridPos', 'blockColor'])` instead of `board.cells[][]`.

Each step is independent. The game works at every stage. GSAP animations stay regardless.
