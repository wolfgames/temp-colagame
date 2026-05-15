# ECS Systems Exploration — What Would Systems Look Like in ClearPop?

**Context:** ClearPop currently has `systems: {}` in its plugin. All game logic is orchestrated imperatively by GameController calling pure functions in sequence. This report explores what it would look like to extract that logic into ECS systems, and which approach an LLM would have the easiest time generating.

---

## Current Flow (Imperative)

GameController.handleTap() does everything in sequence:

```
1. findGroup()          → which blocks to clear
2. calcGroupScore()     → how many points
3. clearGroup()         → remove blocks, damage obstacles, spawn powerup
4. applyGravity()       → tiles fall down
5. refillBoard()        → fill empty cells
6. calcStarsEarned()    → update star rating
7. countObstacles()     → check win condition
8. check win/lose       → navigate to results
```

Each step is a pure function called manually. The controller knows the order, passes results between steps, and fires animations in between.

---

## What ECS Systems Could Look Like

### Option A: Event-Driven Systems (Reactive)

Systems observe data changes and react. No manual orchestration.

```typescript
systems: {
  // When entities are deleted (blocks cleared), calculate score
  scoring_system: {
    create: (db) => {
      db.observe.transactions((txResult) => {
        // React to clearGroup transaction
        if (txResult.deletedCount > 0) {
          const score = calcGroupScore(txResult.deletedCount);
          db.transactions.addScore(score);
        }
      });
    },
  },

  // When score changes, recalculate stars
  star_system: {
    create: (db) => {
      db.observe.resources.score((score) => {
        const config = db.resources.currentLevelConfig;
        const stars = calcStarsEarned(score, config.starThresholds);
        db.transactions.setStarsEarned(stars);
      });
    },
  },

  // When board changes, count obstacles and check win
  win_condition_system: {
    create: (db) => {
      db.observe.components.cellKind(() => {
        const obstacles = db.select(['cellKind'], {
          where: { cellKind: 'obstacle' },
        });
        db.transactions.setBlockerCount(obstacles.length);
        if (obstacles.length === 0) {
          db.transactions.setPhase('won');
        }
      });
    },
  },

  // When moves hit zero, check lose
  lose_condition_system: {
    create: (db) => {
      db.observe.resources.movesRemaining((moves) => {
        if (moves === 0 && db.resources.phase === 'idle') {
          db.transactions.setPhase('lost');
        }
      });
    },
  },
},
```

**Pros:** Declarative, self-contained, each system has one job.
**Cons:** Order of execution is implicit. Hard to reason about cascading observers (score change → stars change → ???). Transaction-inside-observer may violate the "one transaction per action" rule.

**LLM difficulty:** Medium. The observer API needs to be understood correctly. Cascading reactivity is easy to get wrong.

---

### Option B: Init-Only Systems (Register Logic)

Systems run once on database creation. They register the game's logic modules without per-frame ticking.

```typescript
systems: {
  clearpop_initialize: {
    create: (db) => {
      // Register available logic modules — Inspector shows them
      // Actual execution still driven by GameController
    },
  },
},
```

**Pros:** Simple, Inspector shows systems exist, zero behavior change.
**Cons:** Systems don't DO anything — they're just labels. No benefit over the current approach.

**LLM difficulty:** Trivial. But also useless.

---

### Option C: Action-Triggered Systems (Best Fit)

The key insight: ClearPop's game logic is **turn-based**, not per-frame. The right pattern is **actions** that compose transactions, not systems that tick.

```typescript
actions: {
  // High-level game actions that compose multiple transactions
  executeTap: async (db, args: { row: number; col: number; rng: SeededRNG }) => {
    const board = readBoardFromEcs(db, 8, 8);
    const cell = getCell(board, args.row, args.col);

    if (cell?.kind === 'powerup') {
      db.actions.executePowerUp({ row: args.row, col: args.col, rng: args.rng });
      return;
    }

    const group = findGroup(board, args.row, args.col);
    if (group.length < 2) return;

    db.transactions.decrementMoves();

    // Clear → gravity → refill (all pure functions)
    const clearResult = clearGroup(board, group, { row: args.row, col: args.col });
    const gravityResult = applyGravity(clearResult.board);
    const refillResult = refillBoard(gravityResult.board, args.rng, 3);

    // Write final board state
    writeBoardToEcs(db, refillResult.board);

    // Update derived state
    db.transactions.addScore(calcGroupScore(group.length));
    db.transactions.setBlockerCount(countObstacles(refillResult.board));

    const config = db.resources.currentLevelConfig;
    db.transactions.setStarsEarned(calcStarsEarned(db.resources.score, config.starThresholds));

    // Return metadata for animations (actions CAN return values internally)
    return {
      cleared: group,
      movements: gravityResult.movements,
      refills: refillResult.refills,
      spawnedPowerUp: clearResult.spawnedPowerUp,
    };
  },
},
```

Then GameController becomes thin:

```typescript
async function handleTap(pos: GridPos) {
  phase = 'animating';
  const result = db.actions.executeTap({ row: pos.row, col: pos.col, rng });

  // Animate using the returned metadata
  await animatePop(result.cleared);
  await animateGravity(result.movements);
  await animateRefill(result.refills);

  boardRenderer.syncBoard(readBoardFromEcs(db, 8, 8));
  syncHud();

  if (db.resources.blockerCount === 0) { /* won */ }
  if (db.resources.movesRemaining === 0) { /* lost */ }
  phase = 'idle';
}
```

**Pros:**
- All state mutation in one action (undo/redo captures the whole turn)
- GameController only handles input and animation
- Pure functions stay pure — called inside the action
- Inspector shows the action was called
- LLM can generate actions as "do this whole thing" without worrying about order

**Cons:**
- Actions calling multiple transactions may break undo/redo stack (Adobe says "call at most one transaction per action")
- Need to be careful about the return value rule ("UI must never consume return values")

**LLM difficulty:** Low. An action is just "read state, run logic, write state" — the same pattern as the current handleTap but wrapped in an ECS action.

---

### Option D: Computed Observables (Derived State)

Some "systems" are really just derived values. Stars depend on score. Blocker count depends on board state. These could be computed observables:

```typescript
computed: {
  starsEarned: (db) => {
    return Observe.withMap(
      db.observe.resources.score,
      (score) => {
        const thresholds = db.resources.starThresholds;
        return calcStarsEarned(score, thresholds);
      },
    );
  },

  blockerCount: (db) => {
    return Observe.withMap(
      db.observe.components.cellKind,
      () => {
        const obstacles = db.select(['cellKind'], {
          where: { cellKind: 'obstacle' },
        });
        return obstacles.length;
      },
    );
  },

  hasValidMoves: (db) => {
    return Observe.withMap(
      db.observe.components.blockColor,
      () => {
        const board = readBoardFromEcs(db, 8, 8);
        return hasValidGroups(board);
      },
    );
  },
},
```

**Pros:** Truly declarative. Values update automatically. Inspector can show computed values. No manual recalculation.
**Cons:** Computed values can be expensive if they run on every entity change. `readBoardFromEcs` + `hasValidGroups` after every single cell update would be slow.

**LLM difficulty:** Medium. Requires understanding of the Observe API and performance implications.

---

## Recommendation: Option C (Actions) + Option D (Computed)

**Actions for turn logic:**
- `executeTap` — the whole tap→clear→gravity→refill sequence
- `executePowerUp` — powerup detonation sequence
- `startLevel` — generate board, reset resources

**Computed for derived state:**
- `starsEarned` — derived from score + thresholds
- `blockerCount` — derived from obstacle entity count

**What stays in GameController:**
- Input handling (pointertap → which cell?)
- Animation sequencing (GSAP, awaiting promises)
- Screen navigation (won/lost → results)
- Phase management (idle/animating)

**What an LLM would have the easiest time generating:**

Actions. They're the most linear and self-contained:
1. Read state from ECS
2. Run pure functions
3. Write state back to ECS
4. Return animation metadata

No observer chains. No scheduling. No per-frame concerns. Just "input → logic → output" wrapped in a function the ECS knows about.

---

## What the Inspector Would Show

With actions + computed:

```
Entities:     48 (non-empty cells on 8x8 board)
Resources:    score=1250, movesRemaining=22, level=3, phase=idle
Computed:     starsEarned=2, blockerCount=4, hasValidMoves=true
Systems:      clearpop_initialize (ran once)
Actions:      executeTap (last called: 0.3s ago)
```

Compared to today:

```
Entities:     48
Resources:    score=1250, movesRemaining=22, level=3, phase=idle
Systems:      (empty)
```

The computed values and action history give the Inspector meaningful debugging info — you can see derived state updating and which actions fired.
