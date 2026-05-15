# Reactive ECS: Unified Architecture for Agent-Driven Game Development

> **Conceptual only:** This report describes a theoretical "component fields as signals" model. The actual project uses `@adobe/data/ecs` with `db.observe.resources.*` and `Database.observeSelectDeep` — not the APIs described here. For current architecture, see [state-architecture.md](../guides/state-architecture.md).

A comprehensive report on combining Entity Component System architecture with reactive signals into a single system — designed for both runtime performance and AI agent automation.

---

## Part 1: Theory

### What problem are we solving?

Game development needs two things that traditionally require separate architectures:

1. **Reactivity** — when data changes, dependent systems update automatically
2. **Structured data** — game state that is queryable, serializable, and machine-readable

Signals solve (1). ECS solves (2). Neither solves both alone.

### The three classical approaches

#### ECS (Entity Component System)

The dominant architecture in high-performance game engines (Unity DOTS, Bevy, Flecs).

- **Entity** — an opaque ID. No data, no behavior. Just `#4207`.
- **Component** — a plain data struct attached to an entity. `Position { x, y }`, `Health { hp: 100 }`. No logic.
- **System** — a function that queries for entities matching a component signature, then iterates over them all.

**Strengths:**
- Data is flat, contiguous, cache-friendly — processes millions of entities at 60fps
- Components are serializable — snapshot, replay, diff, transfer trivially
- Systems are pure functions — input data, output data, no side effects
- Queries are declarative — "all entities with Health and Poisoned"

**Weakness:**
- No reactivity. Systems run every frame over *everything*, whether it changed or not. Change detection requires manual dirty flags, coarse chunk-level tracking, or event buffers — all of which re-invent reactive graphs with extra steps.

#### Signals (Fine-Grained Reactivity)

The dominant model in modern UI frameworks (Solid, Vue, Angular, Preact).

- **Signal** — a reactive primitive holding a value. Reading it inside an effect creates a dependency.
- **Effect** — a function that auto-tracks which signals it reads and re-runs when they change.
- **Memo** — a cached derived signal that only recomputes when dependencies change.

**Strengths:**
- Zero-cost stillness — nothing happens until something changes
- Surgical updates — only the exact dependents of a changed signal fire
- No polling, no diffing, no dirty flags — the dependency graph is automatic

**Weakness:**
- The dependency graph is implicit and runtime-constructed — hard for an agent to inspect, generate against, or test without running the app
- No built-in concept of "iterate over all things with property X"
- State is scattered across closures, not centralized or queryable

#### Unity Hybrid (MonoBehaviour + DOTS)

Unity's pragmatic answer: use OOP for authoring, ECS for hot paths, bridge between them.

**Strengths:**
- Right tool per subsystem
- Ship games today while migrating hot paths incrementally

**Weakness:**
- Two mental models, bridging overhead, sync bugs between the two worlds

### The key insight

ECS and signals aren't competing architectures — they operate at different layers:

| Layer | ECS provides | Signals provide |
|-------|-------------|-----------------|
| **Data model** | Entities + Components (structured, queryable) | Reactive primitives (automatic propagation) |
| **Iteration** | Queries over archetypes | Not applicable |
| **Change propagation** | Manual / polling | Automatic / surgical |
| **Serialization** | Trivial (plain data) | Hard (closures, graphs) |

The solution: **make component data out of signals.** One system, two capabilities.

---

## Part 2: Reactive ECS Design

### Core principle

> A component's fields are signals. The ECS provides structure; signals provide reactivity. There is no separate "signal layer" and "ECS layer."

### Architecture

```
┌─────────────────────────────────────────────┐
│                   World                      │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Entity 1 │  │Entity 2 │  │Entity N │     │
│  │─────────│  │─────────│  │─────────│     │
│  │Position~│  │Position~│  │Sprite~  │     │
│  │Sprite~  │  │Health~  │  │Tween~   │     │
│  │Health~  │  │Loot~    │  │         │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│                                              │
│  ~ = fields are signals (reactive)           │
│                                              │
│  Systems: [ tweenSystem, spriteSystem, ... ] │
│  Queries: declarative archetype matching     │
└─────────────────────────────────────────────┘
```

### Defining components

```ts
// Each field is a signal — reactive by default
const Position = defineComponent({
  x: signal(0),
  y: signal(0),
})

const Health = defineComponent({
  hp: signal(100),
  max: signal(100),
})

const Sprite = defineComponent({
  key: signal(''),
  visible: signal(true),
})
```

Components are:
- **Schemas** — an agent knows exactly what fields exist and their types
- **Reactive** — mutating `hp` automatically triggers any dependent effect, UI, or system
- **Serializable** — read all signal values to get a plain JSON snapshot

### Defining systems

```ts
// Systems iterate like ECS — query by component signature
function poisonSystem(world: World) {
  for (const e of world.query(Health, Poisoned)) {
    e.health.hp(v => v - 1)  // signal mutation → triggers reactivity
  }
}

// Systems compose — no inheritance, no lifecycle methods
function deathSystem(world: World) {
  for (const e of world.query(Health)) {
    if (e.health.hp() <= 0) {
      world.remove(e)
      emitEvent('death', e)
    }
  }
}
```

Systems are:
- **Pure functions** — world in, side effects out
- **Testable in isolation** — create a world, add entities, run system, assert
- **Composable** — register any combination per game

### Spawning entities

```ts
const world = createWorld()

const goblin = world.spawn(
  Position({ x: 100, y: 200 }),
  Sprite({ key: 'goblin' }),
  Health({ hp: 50, max: 50 }),
)

// Add/remove components dynamically
world.add(goblin, Poisoned({ damage: 2, ticks: 5 }))
world.remove(goblin, Poisoned)
```

### Reactivity flows automatically

```ts
// UI layer — reacts to signal changes with zero wiring
function HealthBar(props: { entity: Entity }) {
  const hp = () => props.entity.health.hp()
  const max = () => props.entity.health.max()
  return <div style={{ width: `${(hp() / max()) * 100}%` }} />
}

// Pixi layer — sprite system syncs reactive data to GPU
function spriteSystem(world: World) {
  for (const e of world.query(Position, Sprite)) {
    // These reads create reactive subscriptions
    // Only entities whose position actually changed get updated
    e.pixiSprite.x = e.position.x()
    e.pixiSprite.y = e.position.y()
  }
}
```

No manual event buses. No pub/sub. No "notify renderer that health changed." The signal graph handles it.

---

## Part 3: The Agent Advantage

### Why agents need ECS, not just signals

An AI agent generating game content needs to:

| Task | What it requires |
|------|-----------------|
| **Understand game state** | Structured, queryable data — not closures |
| **Generate entities** | A schema to validate against |
| **Write systems** | Pure functions with clear inputs/outputs |
| **Test everything** | Deterministic: data in → data out |
| **Inspect at runtime** | Serializable world snapshots |

Signals in isolation are a runtime graph — the agent would need to run the app to understand what depends on what. ECS gives the agent a **static schema** it can reason about at generation time.

### Agent workflows enabled by reactive ECS

#### 1. Entity generation

The agent knows the component schemas. It generates valid entities as data:

```json
{
  "archetype": ["Position", "Sprite", "Health", "Loot"],
  "data": {
    "position": { "x": 100, "y": 200 },
    "sprite": { "key": "goblin", "visible": true },
    "health": { "hp": 50, "max": 50 },
    "loot": { "table": "rare" }
  }
}
```

No framework knowledge needed. No imports. Just data matching a schema.

#### 2. System generation and testing

```ts
// Agent generates this system
function freezeSystem(world: World) {
  for (const e of world.query(Health, Frozen)) {
    e.frozen.ticks(v => v - 1)
    if (e.frozen.ticks() <= 0) world.remove(e, Frozen)
  }
}

// Agent generates this test — no mocks, no DOM, no renderer
test('freeze expires after ticks reach 0', () => {
  const world = createWorld()
  const e = world.spawn(Health({ hp: 100 }), Frozen({ ticks: 1 }))

  freezeSystem(world)

  expect(world.has(e, Frozen)).toBe(false)
})
```

#### 3. World snapshots and validation

```ts
// Serialize entire world state
const snapshot = world.serialize()
// → { entities: [ { id: 1, components: { ... } }, ... ] }

// Agent can diff two snapshots
const before = world.serialize()
runGameLoop(world, 10) // 10 ticks
const after = world.serialize()
const changes = diff(before, after)

// Agent can validate invariants
function validateWorld(world: World) {
  for (const e of world.query(Health)) {
    assert(e.health.hp() <= e.health.max(), `Entity ${e.id}: hp exceeds max`)
    assert(e.health.hp() >= 0, `Entity ${e.id}: negative hp`)
  }
}
```

#### 4. Scaffolding features as a unit

When an agent needs to add a new game mechanic, it generates three files as one atomic unit:

```
components/frozen.ts    → defineComponent({ ticks: signal(5) })
systems/freeze.ts       → freezeSystem function
tests/freeze.test.ts    → data-in / data-out tests
```

Each piece follows a predictable pattern. The component is the schema. The system is the logic. The test proves correctness. No wiring code, no framework glue.

---

## Part 4: Library vs. Game Boundary

### The library ships building blocks

`@wolfgames/game-components` provides reusable components and systems:

```
game-components/
  components/
    position.ts      → Position { x, y }
    sprite.ts        → Sprite { key, visible, alpha, tint }
    tween.ts         → Tween { target, duration, easing }
    health.ts        → Health { hp, max }
    interactive.ts   → Interactive { enabled, hitArea }
  systems/
    tween.ts         → interpolation engine
    sprite.ts        → syncs to Pixi display objects
    collision.ts     → spatial queries
  world.ts           → createWorld, defineComponent, query
```

These are **generic, game-agnostic** building blocks. No opinions about what a "goblin" is.

### The game composes them

`template-amino` (or any game) imports library components, adds game-specific ones, and assembles the world:

```
template-amino/
  components/
    loot.ts          → Loot { table, rarity }
    enemy-ai.ts      → EnemyAI { behavior, target }
    powerup.ts       → Powerup { type, duration }
  systems/
    loot-drop.ts     → when health hits 0, drop loot
    enemy-ai.ts      → pathfinding, aggro
    powerup.ts       → apply/expire effects
  world.ts           → composes library + game components/systems
```

### The split is clean

| Concern | Where it lives |
|---------|---------------|
| What is a Position? | Library |
| What is a Tween? | Library |
| How do tweens interpolate? | Library system |
| What is a Goblin? | Game (entity composed from library components + game components) |
| What happens when a Goblin dies? | Game system |
| How does Pixi render a Sprite? | Library system |

The library never imports from the game. The game composes from the library. An agent can work at either level.

---

## Part 5: Comparison Summary

| Dimension | Pure ECS | Pure Signals | Reactive ECS |
|-----------|----------|-------------|--------------|
| Reactivity | Manual / polling | Automatic | Automatic |
| Queryability | Declarative archetypes | Scattered | Declarative archetypes |
| Serializability | Trivial | Hard | Trivial (read signal values) |
| Agent-friendliness | High (structured schemas) | Low (runtime graphs) | High |
| UI integration | Manual bridging | Native | Native (fields are signals) |
| Testability | Excellent (pure data) | Requires runtime | Excellent (pure data) |
| Performance (bulk) | Excellent | N/A | Good (signal overhead per field) |
| Performance (sparse updates) | Wasteful (iterates all) | Excellent | Excellent |
| Mental models | 1 | 1 | 1 |

### When to use what

- **Reactive ECS** — the default. All game state, all interactive objects, all agent-generated content.
- **Plain tight loop** — when profiling shows signal overhead matters for a specific hot path (particles, projectiles). Drop to a typed array loop for that subsystem only. No framework needed.
- **Signals without ECS** — pure UI state that has no game-world representation (menu open/closed, settings, overlay state).

---

## Glossary

| Term | Definition |
|------|-----------|
| **Entity** | An opaque ID representing a game object. Has no data or behavior of its own. |
| **Component** | A named data struct attached to an entity. Fields are signals. |
| **System** | A function that queries entities by component signature and processes them. |
| **World** | The container for all entities, components, and systems. The single source of truth. |
| **Query** | A declarative filter: "all entities with components A and B." |
| **Archetype** | The set of component types on an entity. Entities with the same archetype are stored together. |
| **Signal** | A reactive primitive. Reading it tracks a dependency; writing it notifies dependents. |
| **Effect** | A function that re-runs when any signal it read changes. |
| **Snapshot** | A serialized copy of the entire world state at a point in time. |
