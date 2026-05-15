# ECS + Inspector Panel: Integration Report

How the reactive ECS and the inspector panel connect — and the work involved.

---

## The Short Version

The inspector panel was designed around **modules with tuning schemas**. A reactive ECS replaces that foundation with **entities, components, and systems**. The inspector doesn't bolt onto the ECS — it *becomes* a view of the ECS world. This simplifies the panel significantly, because the ECS already provides everything the inspector was going to build by hand: registration, schema, lifecycle, composition, and identity.

---

## Part 1: How They Connect

### The ECS world IS the inspector's data source

The current inspector design requires a manual registration API:

```ts
// Current design — manual registration
inspector.register({
  id: 'hotspot',
  category: 'primitive',
  identity: 'instanced',
  schema: hotspotTuning.schema,
  defaults: HOTSPOT_DEFAULTS,
  values: config,
  onChange: (key, value) => { ... },
})
```

With a reactive ECS, this goes away. The world already knows:

- **What exists** — every entity and its components
- **What schema each component has** — `defineComponent()` declares it
- **What values are current** — component fields are signals, always live
- **What changed** — signals notify automatically
- **What's composed** — entity-component relationships are explicit

The inspector just queries the world:

```ts
// With ECS — no registration needed
const inspector = createInspector(world)

// Inspector auto-discovers everything:
// - All component types registered with defineComponent()
// - All entities and which components they carry
// - All systems registered with the world
// - All current values (reads signals)
```

### Mapping: Inspector concepts → ECS concepts

| Inspector (current design) | ECS equivalent |
|---|---|
| Module | Entity (or Component type) |
| Category (primitive/prefab/logic) | Component archetype or tag component |
| Schema | Component definition from `defineComponent()` |
| Defaults | Component default values |
| Current values | Signal reads |
| onChange | Signal writes (reactivity is automatic) |
| Active/Dormant/Removed | Entity exists / has `Dormant` tag / entity destroyed |
| Universal identity | Singleton entity (only one with that component set) |
| Instanced identity | Multiple entities sharing a component type |
| Composition (prefab contains primitives) | Entity with multiple components, or parent-child relations |
| Wired/unwired indicators | Component field has effects subscribed / no subscribers |

### The lifecycle problem dissolves

The inspector design spent significant effort on DORMANT/ACTIVE/REMOVED states and how to pre-tune dormant modules. In ECS:

- **Active** — entity exists in the world with relevant components
- **Pre-tune before mount** — define an archetype template with default values; inspector edits the template, entities spawn with those values
- **Dormant** — either the entity exists with a `Dormant` tag component (systems skip it, inspector shows it grayed out), or it's a template not yet spawned
- **Removed** — entity destroyed. Inspector can keep a snapshot if needed for history

No special lifecycle system. The ECS world state *is* the lifecycle.

### Universal vs. Instanced — already solved

This was the "central design question" in the inspector brainstorm. In ECS it's just data:

- **Universal** — a singleton entity. Only one entity carries the `Companion` component set. Inspector shows it as a single section.
- **Instanced** — multiple entities share the `Hotspot` component type. Inspector shows class defaults (from the component definition) plus per-entity overrides (actual signal values that differ from defaults).

The 3-layer value resolution (module default → class default → instance override) maps to:

1. `defineComponent()` defaults → **module default**
2. Archetype template values → **class default**
3. Entity signal values → **instance override**

The promote/demote workflow becomes: "copy this entity's value to the archetype template" (promote) or "reset this entity's field to the template value" (demote).

---

## Part 2: What the Inspector Becomes

### A world browser

```
+--------------------------------------+
|  Inspector                       < v |
+--------------------------------------+
|  Filter...              [Entities v] |  <- entities / components / systems
+--------------------------------------+
|                                      |
|  > COMPONENTS (types)                |  <- browse by component type
|  +--------------------------------+  |
|  | Position         12 entities   |  |  <- click to list all
|  | Sprite           12 entities   |  |
|  | Health            4 entities   |  |
|  | Hotspot           8 entities   |  |
|  | Interactive        6 entities  |  |
|  +--------------------------------+  |
|                                      |
|  > ENTITIES (by archetype)           |  <- browse by entity
|  +--------------------------------+  |
|  | #1 goblin          ACTIVE      |  |
|  |   Position  x: 100  y: 200     |  |  <- signal values, live
|  |   Sprite    key: "goblin"      |  |
|  |   Health    hp: 47 / 50        |  |  <- bold = differs from default
|  +--------------------------------+  |
|  +- - - - - - - - - - - - - - - -+  |
|  | #2 chest           DORMANT     |  |  <- has Dormant tag
|  |   Position  x: 300  y: 100     |  |
|  |   Sprite    key: "chest"       |  |
|  |   Loot      table: "rare"      |  |
|  +- - - - - - - - - - - - - - - -+  |
|                                      |
|  > SYSTEMS                           |
|  +--------------------------------+  |
|  | tweenSystem        ✓ active    |  |
|  | poisonSystem       ✓ active    |  |
|  | lootDropSystem     ✗ paused    |  |  <- click to toggle
|  +--------------------------------+  |
|                                      |
+--------------------------------------+
|  World: 14 entities | 3 systems      |
|  Snapshot  |  Diff  |  Copy JSON     |
+--------------------------------------+
```

### What changes from the original design

| Original inspector feature | ECS version | Simpler? |
|---|---|---|
| Manual `inspector.register()` | Auto-discovered from world | Yes — zero registration code |
| Module lifecycle tracking | Entity existence + tag components | Yes — no custom state machine |
| Universal vs. Instanced identity | Singleton vs. multiple entities | Yes — no identity system needed |
| Value resolution cascade | Component defaults → template → entity | Same complexity, cleaner model |
| Composition display | Entity's component list | Yes — it's just data |
| Screen awareness | Query entities by screen tag component | Yes — no separate screen system |
| Wired/unwired indicators | Signal subscriber count | Same |
| Preset save/load | Serialize world subset to JSON | Yes — trivial with ECS |
| Promote/demote workflows | Copy between entity and template | Same |

### What stays the same

The UI/UX from the original design is still right:

- DOM sidebar with backtick toggle
- Slider, toggle, dropdown, color, vec2 controls
- Drag-to-adjust, double-click-to-type interactions
- localStorage persistence of overrides
- Canvas overlay mode for spatial editing
- Copy-to-defaults workflow
- Collapse memory, search/filter

These are UI concerns that don't change with the data model.

---

## Part 3: Work Estimate

### What needs to be built

#### ECS Core (the foundation)

| Piece | What | Scope |
|---|---|---|
| `createWorld()` | Entity storage, spawn/destroy, add/remove components | Core — ~200 lines |
| `defineComponent()` | Schema definition with signal fields + defaults | Core — ~80 lines |
| `world.query()` | Archetype-based entity queries | Core — ~150 lines |
| `world.serialize()` / `deserialize()` | Snapshot entire world to/from JSON | Core — ~100 lines |
| System registration | Register/unregister/pause systems | Core — ~60 lines |
| Archetype templates | Reusable entity blueprints with default overrides | Core — ~80 lines |

**Total ECS core: ~670 lines.** This is a minimal reactive ECS, not a full engine. It leverages Solid signals instead of building its own reactivity.

#### Inspector Panel

| Piece | What | Scope |
|---|---|---|
| Panel shell | Sidebar container, backtick toggle, collapse/dock | UI — ~150 lines |
| World browser | Entity list, component tree, system list | UI — ~200 lines |
| Control components | Slider, toggle, dropdown, color, vec2 | UI — ~300 lines (6 controls × ~50 each) |
| Entity detail view | Show all components on an entity, edit signal values | UI — ~150 lines |
| Component type view | Show all entities with a component, class defaults | UI — ~120 lines |
| System controls | Toggle active/paused, show query info | UI — ~60 lines |
| Persistence | localStorage read/write of overrides | Logic — ~80 lines |
| Serialization | Snapshot, diff, copy JSON | Logic — ~100 lines |
| Search/filter | Text filter across entities, components, values | UI — ~60 lines |

**Total inspector: ~1,220 lines.**

#### Migration (connecting to existing code)

| Piece | What | Scope |
|---|---|---|
| Replace tuning registrations | Convert existing `tuning.ts` schemas to `defineComponent()` | Per-module, ~10 min each |
| Replace TuningPanel | Swap Tweakpane for new inspector | One-time, ~1 hour |
| Module → Entity conversion | Each module becomes an entity with components | Per-module, varies |
| System extraction | Pull update logic into standalone system functions | Per-module, varies |

Migration is incremental — both can coexist during transition.

### Phasing

#### Phase 1: ECS Core + Basic Inspector (~2-3 days)

- `createWorld`, `defineComponent`, `query`, `serialize`
- Panel shell with entity list and component editing
- Slider, toggle, dropdown controls
- Backtick toggle, localStorage persistence
- **Result:** Functional world browser that can inspect and edit any entity

#### Phase 2: Templates + Identity (~1-2 days)

- Archetype templates (class defaults)
- Singleton detection (universal prefabs)
- Instance grouping with override highlighting
- Promote/demote between entity and template
- **Result:** Full instanced prefab workflow from original design

#### Phase 3: Systems + Spatial (~1-2 days)

- System registration, toggle, and query display
- Canvas overlay for vec2/position editing
- Drag-to-reposition entities
- **Result:** Unity-style scene + inspector interaction

#### Phase 4: Agent Integration (~1 day)

- Snapshot/diff/restore commands
- JSON export for agent consumption
- Validation queries (invariant checking)
- **Result:** Agent can inspect, generate, and test against the world

**Total: ~5-8 days for everything.** Phase 1 alone gives you a working system.

---

## Part 4: What Gets Simpler, What Gets Harder

### Simpler

- **No registration API** — the world is the registry
- **No lifecycle state machine** — entity existence is the lifecycle
- **No identity system** — singleton vs. multiple is implicit
- **No composition tracking** — components on an entity are the composition
- **Testing** — pure data in/out, no mocks, no DOM
- **Agent automation** — structured schemas, serializable state, queryable world

### Harder (or same)

- **The ECS itself has to work** — this is new infrastructure, not just a UI panel
- **Migration** — existing modules need to become entities+components
- **Signal overhead per field** — fine for hundreds of entities, profile if thousands
- **Two learning curves** — team needs to learn ECS concepts + new inspector

### Net assessment

The inspector brainstorm identified 4 hard problems: registration, lifecycle, identity, and composition. The ECS solves all four as inherent properties of its data model. The remaining work is UI — controls, layout, interactions — which is straightforward SolidJS component work.

The ECS is the bigger investment, but it pays for itself beyond just the inspector: agent automation, testing, serialization, and a cleaner mental model for the whole game.
