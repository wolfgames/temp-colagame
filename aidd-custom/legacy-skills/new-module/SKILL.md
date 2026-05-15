---
name: new-module
description: >
  Scaffold a new module in src/modules/. Creates directory structure, derives
  naming tokens from a kebab-case input, copies and hydrates templates, verifies
  the build, and updates the module index. Use when the user wants to create a
  new primitive, logic module, or prefab.
  Triggers on: new module, create module, add module, scaffold module, newmodule.
user-invocable: true
compatibility: Requires bun/npm, TypeScript, and the template files in docs/factory/templates/modules/.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# 🧩 New Module

Act as a senior software engineer to scaffold a new module in `src/modules/`
following the Amino 3-tier architecture conventions.

Competencies {
  kebab-case → multi-case name derivation
  template hydration (token replacement)
  Amino module placement rules (primitive / logic / prefab)
  TypeScript strict compilation verification
}

Constraints {
  Only creates files inside `src/modules/<category>/<name>/`.
  Never modifies `src/core/` or `src/game/`.
  Templates live in `docs/factory/templates/modules/` — read them, do not modify them.
  All naming is derived from a single kebab-case input.
  Communicate each step as friendly markdown prose — not raw SudoLang syntax.
  Do ONE step at a time, get user approval before moving on.
}

## Step 1 — Gather Input

```sudolang
gatherInput() => { moduleName, category } {
  1. Ask the user for:
     - Module name in kebab-case (e.g. "sprite-button")
     - Category: primitive | logic | prefab
  2. If the user provides a PascalCase or camelCase name, convert to kebab-case
     and confirm with the user
  3. Validate the category is one of the three allowed values
}
```

## Step 2 — Derive Naming Tokens

```sudolang
deriveTokens(moduleName) => tokens {
  From the kebab-case module name, derive all variants:

  | Token                  | Example (sprite-button)   |
  |------------------------|---------------------------|
  | __MODULE_NAME__        | sprite-button             |
  | __PASCAL_NAME__        | SpriteButton              |
  | __UPPER_SNAKE_NAME__   | SPRITE_BUTTON             |
  | __CAMEL_NAME__         | spriteButton              |
  | __DISPLAY_NAME__       | Sprite Button             |

  Display the derived tokens to the user for confirmation.
}
```

## Step 3 — Create Directory and Hydrate Templates

```sudolang
createModule(tokens, category) => files {
  1. Create directory: `src/modules/<category>/<name>/`
  2. Read templates from `docs/factory/templates/modules/`:

     Primitive & Prefab:
     - `<category>.index.ts`          → `index.ts`
     - `<category>.defaults.ts`       → `defaults.ts`
     - `<category>.tuning.ts`         → `tuning.ts`
     - `<category>.renderer.pixi.ts`  → `renderers/pixi.ts`

     Logic:
     - `logic.index.ts`               → `index.ts`
     - `logic.defaults.ts`            → `defaults.ts`
     - `logic.tuning.ts`              → `tuning.ts`

  3. Replace all `__TOKEN__` placeholders with derived values
  4. Write hydrated files to the module directory
}
```

## Step 4 — Verify Build

```sudolang
verifyBuild() => pass | fail {
  1. Run `bun run typecheck`
  2. pass => continue
  3. fail => read errors, fix issues in generated files, re-run until clean
}
```

## Step 5 — Update Module Index

```sudolang
updateIndex(tokens, category) => updatedIndex {
  1. Read `src/modules/INDEX.md`
  2. Add a new row to the correct category table (Primitives / Logic / Prefabs):
     | <Display Name> | `<category>/<name>/` | <brief description> |
  3. Write the updated INDEX.md
}
```

newModule = gatherInput |> deriveTokens |> createModule |> verifyBuild |> updateIndex

## Where to Put It

| What you're building | Category |
|---------------------|----------|
| Single-purpose visual component (sprite, button, bar) | `primitives/` |
| Pure logic, no rendering (state machine, scoring, loader) | `logic/` |
| Assembles multiple primitives into a higher-level unit | `prefabs/` |
| Reusable across games? → `modules/`. Game-specific? → `src/game/` | — |

## Output

```
Created src/modules/<category>/<name>/:
  - index.ts
  - defaults.ts
  - tuning.ts
  - renderers/pixi.ts  (primitive and prefab only)

Updated: src/modules/INDEX.md
```

Commands {
  🧩 /new-module - scaffold a new module in src/modules/ with templates and naming conventions
}

### Exit Criteria (Given/Should)

- Given the module directory is listed, should contain index.ts, defaults.ts, tuning.ts, and renderers/pixi.ts (for primitives/prefabs)
- Given any generated file is searched for `__`, should find zero unhydrated tokens
- Given `bun run typecheck` is run, should produce zero errors
- Given `src/modules/INDEX.md` is read, should contain the new module in the correct category table
- Given `src/core/` and `src/game/` are checked in git diff, should show zero modifications
