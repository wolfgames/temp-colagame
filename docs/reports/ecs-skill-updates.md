# ECS Skill Updates — Changelog

Tracks changes made to the `aidd-ecs` skill and related ECS documentation. Use this when propagating updates to other skills, docs, or downstream repos.

---

## 2026-04-09 — Store vs Database, resources schema rule

**Files changed:**
- `ai/skills/aidd-ecs/SKILL.md`

**What was added:**
- **Store vs Database section** — explains the two layers: Store is low-level/synchronous (use inside system initializers), Database is transaction-based/observable (use for application code)
- **Resources schema constraint** — "Do NOT use explicit schemas for resources — use only `{ default: value as Type }`" added to Execute constraints. Resources have one value, no linear memory layout needed.

**Source:** Official `@adobe/data` AGENTS.md

**Where else this might need updating:**
- `.cursor/skills/aidd-ecs/SKILL.md` (symlinked, auto-syncs)
- `docs/factory/newgame.md` — if it references ECS plugin patterns
- `aidd-custom/legacy-skills/build-game/SKILL.md` — references `ai/skills/aidd-ecs/` for ECS patterns
- Other repos consuming `@wolfgames/components` that use `@adobe/data/ecs`

---

## 2026-04-08 — Inspector bridge, schema types, example plugin

**Files changed:**
- `ai/skills/aidd-ecs/SKILL.md`
- `ai/skills/aidd-ecs/data-modeling.md`
- `src/core/systems/ecs/DbBridge.ts` (new)
- `src/core/systems/ecs/index.ts`
- `src/core/systems/ecs/demo-world.ts` → `ExamplePlugin.ts` (renamed)
- `src/app.tsx`

**What was added:**

### SKILL.md
- **Schema types section** — when to use namespace schemas (`F32.schema`, `Vec2.schema`) vs inline `{ type, default } as const`. Table mapping data types to schema choices.
- **Inspector integration section** — bridge signal import path (`~/core/systems/ecs`), wiring pattern (setActiveDb on create/destroy), sync pattern for grid games, required components for Inspector display (spriteKey, position, gameName).
- **Canonical example reference** — points to `src/core/systems/ecs/ExamplePlugin.ts`

### data-modeling.md
- **Game entity example** — shows strings, booleans, transient components, late-init resources alongside the existing particle simulation example
- **Updated guidelines** — covers transient, Inspector components, late-init patterns

### Core infrastructure
- **DbBridge.ts** — SolidJS signal (`activeDb` / `setActiveDb`) in `src/core/systems/ecs/`. Re-exported from barrel. Games set it on create, clear on destroy.
- **ExamplePlugin.ts** — renamed from `demo-world.ts`. Uses `F32.schema` for numeric components, `db.store.archetypes` init pattern in system initializer, canonical naming.
- **app.tsx** — Inspector wired to bridge signal with `<Show when={activeDb()}>`, falls back to example DB when no game is active.

**Source:** PuzzleBox build experiment (6 puzzle games) exposed the gap. Verified against official `@adobe/data` AGENTS.md and the `data-react-pixie` example.

**Where else this might need updating:**
- Any game that creates an ECS Database should call `setActiveDb(db)` / `setActiveDb(null)`
- `docs/guides/new-game.md` — could reference the Inspector wiring step
- `aidd-custom/legacy-skills/build-game/SKILL.md` — Stage 2 (Micro Loop) could mention ECS Inspector wiring
