# State Architecture — Where State Lives and Why

Lessons from converting ClearPop to ECS. Applicable to any game built on this scaffold.

---

## The Two Layers

### 1. ECS Database (`@adobe/data/ecs`) — Game State

Everything the game cares about lives here. Resources, entities, actions, computed values.

**Use for:**
- Board/world state (entities with components)
- Game resources (score, moves, level, phase, coins, lives)
- Turn logic (actions that compose read → pure logic → write)
- Derived state (computed observables for stars, blocker count)
- Anything visible in the Inspector panel

**How to write:** `db.transactions.setScore(100)` or `db.actions.executeTap({ row, col, rng })`
**How to read:** `db.resources.score` (direct) or `db.observe.resources.score(callback)` (reactive)

### 2. SolidJS Signals — DOM Screen Bridge

Signals exist only because DOM screens (loading, start, results) can't access the ECS database directly. The observe bridge auto-syncs ECS → signals:

```typescript
db.observe.resources.score((v) => gameState.setScore(v));
```

**Use for:**
- State that DOM screens read (ResultsScreen shows score, stars, level)
- State that survives game destroy/recreate (level number between games)
- Complex objects that don't fit ECS schemas (LevelConfig)

**Not for:** Game logic. Don't write game state to signals directly — write to ECS, let the bridge propagate.

---

## Decision Table

| State | Where | Why |
|-------|-------|-----|
| Score, moves, level, stars, phase | ECS resource | Source of truth, Inspector visible, observable |
| BlockerCount | ECS computed | Derived from obstacle entity count |
| Stars | ECS computed | Derived from score + thresholds |
| Coins, lives | ECS resource | Meta-progression, bridged to signals |
| Board cells (blocks, obstacles, powerups) | ECS entities | Source of truth, Inspector shows every cell |
| Level config (complex object) | SolidJS signal | Too complex for ECS schema, ResultsScreen needs it |
| RNG state | Closure variable | Stateful, not observable, not ECS territory |
| Board during animation | Closure variable | Working copy while GSAP animates, not source of truth |

---

## Plugin Structure

The plugin is the single definition of what exists in the game world:

```typescript
const clearpopPlugin = Database.Plugin.create({
  components: { ... },     // per-entity data (position, color, HP, etc.)
  resources: { ... },      // global state (score, moves, phase, etc.)
  archetypes: { ... },     // entity templates (Block, Obstacle, PowerUp)
  computed: {
    stars: ...,            // derived from score + thresholds
    blockerCount: ...,     // derived from obstacle entity count
  },
  transactions: {
    replaceBoard: ...,     // atomic board write
    setScore: ...,         // resource mutations
    decrementMoves: ...,
    setPhase: ...,
  },
  actions: {
    executeTap: ...,       // full tap turn (clear → gravity → refill)
    executePowerUp: ...,   // powerup detonation turn
    initLevel: ...,        // generate board, reset resources
  },
  systems: {
    clearpop_initialize: { create: () => {} },
  },
});
```

## Actions — Turn Logic

Actions encapsulate an entire turn. They read board state from ECS, run pure functions, write results back, and return animation metadata:

```typescript
executeTap(db, args: { row, col, rng }) {
  // 1. Read board from entities
  const board = readBoardFromEcs(db, cols, rows);

  // 2. Run pure logic chain
  const clearResult = clearGroup(board, group, tapPos);
  const gravityResult = applyGravity(clearResult.board);
  const refillResult = refillBoard(gravityResult.board, rng, colorCount);

  // 3. Write final state to ECS (single action boundary)
  db.transactions.replaceBoard({ board: refillResult.board });
  db.transactions.addScore(score);

  // 4. Return animation metadata (controller uses this for GSAP)
  return {
    group, movements, refills, spawnedPowerUp, finalBoard,
  };
}
```

The controller becomes thin:

```typescript
const result = db.actions.executeTap({ row, col, rng });
// Animate using metadata
await animatePop(result.group);
await animateGravity(result.movements);
await animateRefill(result.refills);
boardRenderer.syncBoard(result.finalBoard);
```

## Computed — Derived State

Values that depend on other state. Auto-update when dependencies change:

```typescript
computed: {
  stars: (db) => Observe.withMap(
    db.observe.resources.score,
    (score) => calcStarsEarned(score, thresholds),
  ),
  blockerCount: (db) => Observe.withMap(
    db.observe.components.cellKind,
    () => /* count obstacle entities */,
  ),
},
```

No manual `setStarsEarned` after every move — it updates automatically.

---

## Data Flow

```
User Tap
  │
  ├─ db.actions.executeTap({ row, col, rng })
  │     ├─ readBoardFromEcs()          ← entities → BoardState
  │     ├─ clearGroup(board)           ← pure function
  │     ├─ applyGravity(board)         ← pure function
  │     ├─ refillBoard(board)          ← pure function
  │     ├─ db.transactions.replaceBoard()  ← BoardState → entities
  │     ├─ db.transactions.addScore()      ← resource update
  │     └─ return { group, movements, refills, finalBoard }
  │
  ├─ animate(result.movements)          ← GSAP (reads metadata)
  │
  ├─ computed.stars auto-updates        ← score changed → stars recalc
  ├─ computed.blockerCount auto-updates ← entities changed → recount
  │
  └─ db.observe → signals → DOM        ← automatic via bridge
```

## The Signal Gap

The game's ECS database is created in `GameController.init()` and destroyed in `GameController.destroy()`. Between games (on the ResultsScreen), the DB doesn't exist. ResultsScreen reads/writes SolidJS signals directly. When the next game starts, `db.actions.initLevel()` reads the current level from signals and writes everything into the new DB.

This is inherent to the scaffold's screen lifecycle — the game screen owns the DB's lifetime. Signals bridge the gap.

## The Observe Bridge

One function wires all ECS resources → SolidJS signals:

```typescript
function bridgeEcsToSignals(db) {
  db.observe.resources.score((v) => gameState.setScore(v));
  db.observe.resources.movesRemaining((v) => gameState.setMovesRemaining(v));
  db.observe.resources.level((v) => gameState.setLevel(v));
  // ... all resources
}
```

Called once on game init. Returns cleanup function called on destroy. DOM screens never know about ECS.

---

## What GameController Does

After full ECS conversion, the controller is a thin shell:

**3 game logic imports:** `getCell` (pre-tap check), `findGroup` (valid group check), `readBoardFromEcs` (board reconstruction)

**Responsibilities:**
- Input handling (pointertap → which cell?)
- Two action calls (`db.actions.executeTap()`, `db.actions.executePowerUp()`)
- Animation sequencing from action metadata (GSAP)
- Juice/VFX events
- Screen navigation (won/lost → results)

**Not responsible for:**
- Board logic (lives in actions)
- Score calculation (lives in actions)
- Star calculation (lives in computed)
- Blocker counting (lives in computed)
- Phase management (ECS resource)
- Resource updates (ECS transactions)

---

## When NOT to Use ECS

- **Prototyping** — signals + closure variables are faster to iterate on. Add ECS later.
- **DOM-only games** — if there's no Pixi canvas, ECS adds overhead with no Inspector benefit.
- **Ephemeral state** — animation progress, tween targets, particle lifetimes. Let GSAP own these.
- **Complex nested objects** — ECS components are flat. If your state is deeply nested, signals or plain objects are simpler.

---

## Conversion Order (if starting from signals)

1. **Add ECS infrastructure** — port from ECS branch, add `@adobe/data` dep
2. **Observation layer** — mirror board state as entities, see it in Inspector
3. **Resources** — move score/moves/level from signals to ECS resources, add observe bridge
4. **Actions** — wrap turn logic in actions, thin the controller
5. **Computed** — derived state (stars, blocker count) auto-updates
6. **Phase** — move from closure variable to ECS resource
7. **Remaining signals** — coins, lives, anything else

Each step ships independently. The game works at every stage.
