---
name: aidd-ecs
description: Enforces @adobe/data/ecs best practices. Use this whenever @adobe/data/ecs is imported, when creating or modifying Database.Plugin definitions, or when working with ECS components, resources, transactions, actions, systems, or services.
---

# @adobe/data ECS

## Store vs Database

**Store** — low-level, synchronous, direct mutations. No transactions, no observability. Use for performance-critical code or inside system initializers (`db.store.archetypes.X.insert()`).

**Database** — wraps a Store. Transaction-based mutations with undo/redo support. Observable for reactive updates. All game-facing mutations go through `db.transactions.*`.

Use Database for application code. Use Store only inside system `create` functions for initial entity population.

---

## Database.Plugin authoring

Plugins are created with `Database.Plugin.create()` from `@adobe/data/ecs`.

## Property order (enforced at runtime)

Properties **must** appear in this exact order. All are optional.

```sudolang
PluginPropertyOrder [
  "extends — Plugin, base plugin to extend"
  "services — (db) => ServiceInstance, singleton service factories"
  "components — schema object, ECS component schemas"
  "resources — { default: value as Type }, global resource schemas"
  "archetypes — ['comp1', 'comp2'], standard ECS archetypes; storage tables for efficient insertions"
  "computed — (db) => Observe<T>, computed observables"
  "transactions — (store, payload) => void, synchronous deterministic atomic mutations"
  "actions — (db, payload) => T, general functions"
  "systems — { create: (db) => fn | void }, per-frame (60fps) or init-only"
]

Constraints {
  Properties must appear in this exact order; wrong order throws at runtime
}
```

---

## Composition

**Single extension** — one plugin extends another:
```ts
export const authPlugin = Database.Plugin.create({
  extends: environmentPlugin,
  services: {
    auth: db => AuthService.createLazy({ services: db.services }),
  },
});
```

**Combine** — `extends` accepts only one plugin. To extend from multiple use Database.Plugin.combine:
```ts
export const generationPlugin = Database.Plugin.create({
  extends: Database.Plugin.combine(aPlugin, bPlugin),
  computed: {
    max: db => Observe.withFilter(
        Observe.fromProperties({
            a: db.observe.resources.a,
            b: db.observe.resources.b
        }),
        ({ a, b }) => Math.max(a, b)
    )
  },
});
```

**Final composition** — combine all plugins into the app plugin:
```ts
export const appPlugin = Database.Plugin.combine(
  corePlugin, themePlugin, dataPlugin,
  authPlugin, uiPlugin, featurePlugin
);

export type AppPlugin = typeof appPlugin;
export type AppDatabase = Database.Plugin.ToDatabase<AppPlugin>;
```

---

## Property details

### services

Factory functions creating singleton services. Extended plugin services initialize first, so `db.services` has access to them.

```ts
services: {
  environment: _db => EnvironmentService.create(),
}
```

### components

Schema objects defining ECS component data. Use schema imports from type namespaces or inline schemas. See [data-modeling.md](data-modeling.md) for a simple example.

```ts
components: {
  layout: Layout.schema,
  layoutElement: { default: null as unknown as HTMLElement, transient: true },
  layoutLayer: F32.schema,
},
```

Non-persistable values (e.g. HTML elements, DOM refs) must use `transient: true` — excluded from serialization.

### resources

Global state not tied to entities. Use `as Type` to provide the compile-time type — without it the value is treated as a const literal. See [data-modeling.md](data-modeling.md) for patterns.

```ts
resources: {
  themeColor: { default: 'dark' as ThemeColor },
  themeScale: { default: 'medium' as ThemeScale },
},
```

Use `null as unknown as Type` for resources initialized later in a system initializer:

```ts
resources: {
  connection: { default: null as unknown as WebSocket },
},
```

### archetypes

Standard ECS archetypes. Used for querying and inserting related components. See [data-modeling.md](data-modeling.md) for a simple example.

```ts
archetypes: {
  Layout: ['layout', 'layoutElement', 'layoutLayer'],
},
```

### computed

Factory returning `Observe<T>` or `(...args) => Observe<T>`. Receives full db.

```ts
computed: {
  max: db => Observe.withFilter(
    Observe.fromProperties({
      a: db.observe.resources.a,
      b: db.observe.resources.b,
    }),
    ({ a, b }) => Math.max(a, b)
  ),
},
```

### transactions

Synchronous, deterministic atomic mutations. Receive `store` and a payload. Store allows direct, immediate mutation of all entities, components, and resources.

```ts
transactions: {
  updateLayout: (store, { entity, layout }: { entity: Entity; layout: Layout }) => {
    store.update(entity, { layout });
  },
  setThemeColor: (store, color: ThemeColor) => {
    store.resources.themeColor = color;
  },
},
```

```sudolang
StoreAPI {
  "store.update(entity, data)" = "update entity components"
  "store.resources.x = value" = "mutate resources"
  "store.get(entity, 'component')" = "read component value"
  "store.read(entity)" = "read all entity component values"
  "store.read(entity, archetype)" = "read entity component values in archetype"
  "store.select(archetype.components, { where })" = "query entities"
}
```

### actions

General functions with access to the full db. Can return anything or nothing.
UI components that call actions MUST never consume returned values — call for side effects only. Consuming return values violates unidirectional flow (data down via Observe, actions up as void).
Call at most one transaction per action; multiple transactions corrupt the undo/redo stack.

```ts
actions: {
  generateNewName: async (db) => {
    const generatedName = await db.services.nameGenerator.generateName();
    db.transactions.setName(generatedName);
  },
  getAuth: db => db.services.auth,
},
```

### systems

`create` receives db and may optionally return a per-frame function (60fps) or just initialize values. Always called synchronously when `database.extend(plugin)` runs.

```ts
systems: {
  ui_state_plugin_initialize: {
    create: db => {
      db.transactions.registerViews(views);
    },
  },
  layout_plugin__system: {
    create: db => {
      const observer = new ResizeObserver(/* ... */);
      Database.observeSelectDeep(db, db.archetypes.Layout.components)(entries => {
        // react to entity changes
      });
    },
  },
},
```

**System scheduling** (optional):
```ts
systems: {
  physics: {
    create: db => () => { /* per-tick work */ },
    schedule: {
      before: ['render'],
      after: ['input'],
      during: ['simulation'],
    },
  },
},
```

```sudolang
Schedule {
  before: "hard ordering constraints"
  after: "hard ordering constraints"
  during: "soft preference for same execution tier"
}
```

---

## Naming conventions

```sudolang
PluginNaming {
  file: "*Plugin.ts (PascalCase) — e.g. LayoutPlugin.ts (diverges from Adobe's kebab-case convention)"
  export: "*Plugin (camelCase) — e.g. layoutPlugin"
  system: "plugin_name__system (snake_case, double underscore) — e.g. layout_plugin__system"
  initSystem: "plugin_name_initialize — e.g. ui_state_plugin_initialize"
}
```

---

## Type utilities

```ts
export type MyDatabase = Database.Plugin.ToDatabase<typeof myPlugin>;
export type MyStore = Database.Plugin.ToStore<typeof myPlugin>;
```

---

## Schema types

### Namespace schemas (numeric — linear memory)

Use for numeric components where performance matters. These store values in typed arrays.

```ts
import { Vec2, Vec3, F32, U32, I32 } from '@adobe/data/math';

components: {
  position: Vec2.schema,
  velocity: Vec3.schema,
  health: F32.schema,
  level: U32.schema,
}
```

### Inline schemas (strings, booleans)

Use for non-numeric values. These use standard JS storage.

```ts
components: {
  spriteKey: { type: 'string', default: '' } as const,
  visible: { type: 'boolean', default: true } as const,
}
```

### When to use which

| Data | Schema | Why |
|------|--------|-----|
| Position, velocity, size | `Vec2.schema` / `Vec3.schema` | Linear memory, SIMD-friendly |
| HP, score, alpha, scale | `F32.schema` | Float precision, typed array |
| Count, index, level | `U32.schema` / `I32.schema` | Integer, typed array |
| Names, keys, labels | `{ type: 'string', default: '' } as const` | Variable-length, no benefit from linear memory |
| Flags, toggles | `{ type: 'boolean', default: false } as const` | Single bit, no benefit from linear memory |
| DOM refs, non-persistable | `{ default: null as unknown as Type, transient: true }` | Excluded from serialization |

### Canonical example

`src/core/systems/ecs/ExamplePlugin.ts` shows all patterns. Copy it when starting a new game plugin.

---

## Inspector integration

Connect a game's ECS database to the dev Inspector panel so entities are visible at runtime.

### Bridge signal

`src/core/systems/ecs/DbBridge.ts` exports a SolidJS signal. Import from the core ECS barrel:

```ts
import { setActiveDb } from '~/core/systems/ecs';
```

### Wiring pattern

```ts
// On create — connect to Inspector:
const db = Database.create(myPlugin);
setActiveDb(db);

// On destroy — disconnect:
setActiveDb(null);
```

### Sync pattern (grid games)

Grid-based games use a 2D array for logic and project into ECS for observability:

```ts
function syncEcs() {
  db.transactions.clearAll();
  for (const item of gameState) {
    db.transactions.spawn({ /* re-insert from current state */ });
  }
  db.transactions.setScore({ score });
}
```

Call `syncEcs()` after every state mutation.

### Required components for Inspector display

- `spriteKey: { type: 'string', default: '' }` — entity display name in Inspector
- `position: Vec2.schema` — enables overlay positioning on canvas
- `gameName` resource — shown in Inspector header

---

## Execute

```sudolang
fn whenCreatingOrModifyingPlugin() {
  Constraints {
    Verify property order matches (extends, services, components, resources, archetypes, computed, transactions, actions, systems)
    Use extends for single-parent; Database.Plugin.combine() for multiple peers
    Ensure services only access db.services from extended plugins (not forward references)
    Use namespace schemas (F32, Vec2, etc.) for numeric components; inline schemas for strings/booleans
    Do NOT use explicit schemas for resources — use only { default: value as Type } (one value, no linear memory needed)
    Export type *Database = Database.FromPlugin<typeof *Plugin> when consumers need typed db access
    Follow naming conventions for files, exports, and systems
    When building a game: wire setActiveDb(db) on create, setActiveDb(null) on destroy
    Include spriteKey component and gameName resource for Inspector visibility
  }
}
```

## Additional resources

- [data-modeling.md](data-modeling.md) — Components, resources, and archetypes
- `src/core/systems/ecs/ExamplePlugin.ts` — Canonical plugin with all patterns
