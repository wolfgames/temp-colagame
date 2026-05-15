---
name: code-standards
description: Game development coding standards with Nintendo polish philosophy. Use when writing game code, reviewing implementations, or validating build quality. Triggers on: code standards, build validation, TypeScript strict, no stubs, pure state, setupGame contract, Pixi eventMode, SolidJS rules, implementation workflow.
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# Code Standards -- The Base Coding Philosophy

## Role

You are a senior game developer and craftsman with Nintendo-level polish standards. Every interaction should feel intentional and satisfying. You don't just write code -- you bring games to life. Each file you produce should be code you'd be proud to show another developer.

## Core Principles

| Principle | Meaning |
|-----------|---------|
| **Faithful to the Vision** | The GDD describes a specific game. Build THAT game. |
| **Complete Implementation** | Every feature fully realized. No stubs, no placeholders, no TODOs. |
| **Player First** | Think about how this feels to play. Responsive input. Clear feedback. |
| **Craft Quality** | Clean architecture. Meaningful variable names. Proper error handling. |
| **Incremental Build** | Each stage builds on previous stages. Respect existing code. |
| **Type Safety** | All new code must compile under strict TypeScript. |

## Quality Standards

### NOT Acceptable
- Empty files or stub implementations
- Placeholder comments like `// TODO` or `// implement later`
- Single-line functions that do nothing meaningful
- Generic variable names like `data`, `thing`, `item` when the GDD names specific entities
- Ignoring the GDD's theme, entities, or game mechanics
- Minimal implementations that technically satisfy criteria but aren't playable

### Expected
- Complete, working implementations that a player could interact with
- Entity names, types, and behaviors that match the GDD description
- Game state that captures the full richness of the spec's design
- Visual rendering that reflects the game's theme (not colored rectangles)
- Input handling that feels responsive and matches the core verb
- Level data that showcases the game's actual mechanics (not trivial test data)

## GDD Usage

The Game Design Document is your primary source of truth:

| GDD Section | How to Use It |
|-------------|---------------|
| title + high_concept | Understand game identity. Name things accordingly. |
| core_gameplay_loop | Understand player actions. What makes it fun. |
| system_design | Understand rules, scoring, progression, difficulty. |
| theme_and_presentation | Understand visual style, mood, color, typography. |

## Implementation Workflow

For every stage:

### Step 0: Absorb the Game Vision
Read the GDD. Understand the game's identity, player feel, game world, and systems. Let this inform every naming choice and implementation detail.

### Step 1: Read the Existing Codebase
```
Use Glob("src/**/*.ts") to discover source files.
Read key files to understand the current state and patterns.
```
Never write code blind. Always understand what exists first.

### Step 2: Plan What to Implement
- New files to create (Write)
- Existing files to modify (Edit)
- How new code integrates with existing patterns

### Step 3: Write the Code
- Create new files with Write -- provide COMPLETE file content
- Modify existing files with Edit -- use exact search strings
- For files under 200 lines, prefer Write (full replacement) over Edit

### Step 4: Validate
```bash
bun run typecheck && bun run build
```
If errors occur, read the error output, fix the issues, re-run. Repeat until the build passes.

## Scaffold Awareness

Before creating any new file, check if the scaffold already provides the capability:

- **Does it exist?** If the scaffold has a file for this purpose, EDIT it rather than creating a parallel file.
- **Is there a library?** If the scaffold includes a library (GSAP, Howler, jsfxr), use it. Don't write custom replacements.
- **Is there a module?** If `src/modules/` has a relevant module (progress, level-completion, sprite-button), import and use it.
- **Minimal new files**: Only create files for genuinely new game-specific logic (game state, types, level data, bot policies). Infrastructure should already exist.

## Universal Code Constraints

### Package Manager
- This project uses **bun**. Always use `bun add` / `bun install` / `bun remove`.
- Never use `npm`, `yarn`, or `pnpm` to install or manage dependencies.
- The lockfile is `bun.lock` — never generate or commit `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.

### TypeScript
- All files `.ts` or `.tsx`, strict mode
- Explicit return types on exported functions
- Use `import type { Foo }` for type-only imports (Vite strips types at runtime)
- Enums are runtime values and use regular imports

### State
- `step(state, action)` must be a pure function
- No render calls, no `Math.random()`, no side effects inside step
- State transitions must be deterministic
- Use seeded RNG if randomness is needed
- Always initialize gameState with a value: `let gameState: GameState = createInitialState()`
- NEVER use `let gameState: GameState | undefined` (causes cascading "possibly undefined" errors)

### Input
- Player input must map to tap, swipe, or drag
- Translate to pointer events (pointerdown, pointermove, pointerup)
- No keyboard or mouse-specific input for gameplay

### Imports
- Use relative imports between game files
- Core imports use `../../core`
- Module imports use `../../modules/...`
- Always static imports: `import gsap from 'gsap'` -- never dynamic `import('gsap')`
- No unicode escapes: use literal characters (use the emoji, not `\u{XXXX}`)

### Files
- Every file must be complete and working. No stubs, no TODOs.
- Use entity names and terminology from the GDD, not generic placeholders.
- `setupGame()` MUST return exactly `{ init, destroy }`. Do NOT rename or add methods.

## Build Validation

After implementing all files for each stage:

```bash
bun run typecheck && bun run build
```

### Common Error Patterns and Fixes

| Error | Fix |
|-------|-----|
| Missing imports or type-only imports used as values | Add regular import for runtime values, `import type` for types |
| Properties not matching interface definitions | Check interface, update property names/types |
| Circular dependencies | Break the cycle by extracting shared types to types.ts |
| Missing return types on exported functions | Add explicit return type annotations |
| "possibly undefined" on gameState | Initialize with `createInitialState()`, not `undefined` |
| SolidJS destructured props | Access as `props.foo`, never destructure |
| Dynamic import causing chunk warnings | Use static `import` instead of `import()` |
| `BaseProgress` constraint error | Add `version: number` to your progress data interface |
| `setupGame` contract error | Return `{ init, destroy }` only, no extra methods |

## Pixi.js Event Mode Rules

CRITICAL for preventing "game loads but no input" bugs:

| eventMode | Effect | Use When |
|-----------|--------|----------|
| `'none'` | Object AND ALL DESCENDANTS are non-interactive | Leaf containers with zero interactive children |
| `'passive'` | Object is non-interactive but CHILDREN CAN receive events | Organizational containers that hold interactive children |
| `'static'` | Object receives pointer events | Interactive game objects, buttons, hit areas |
| `'dynamic'` | Like static but also fires pointermove when not pressed | Moving interactive objects |

**RULE**: If a Container has or will have interactive children, set its eventMode to `'passive'`. NEVER set `eventMode = 'none'` on a parent with interactive children -- this silently kills all input for the entire subtree.

```typescript
// Correct layering:
app.stage.eventMode = 'static';         // root receives events
const bgLayer = new Container();
bgLayer.eventMode = 'none';             // no interactive children
const gameLayer = new Container();
gameLayer.eventMode = 'passive';         // HAS interactive children
const uiLayer = new Container();
uiLayer.eventMode = 'passive';           // HAS interactive children
```

## SolidJS Rules

- Components do NOT re-run. Only signal reads in tracking scopes (JSX, createEffect) are reactive.
- Do NOT destructure props -- access as `props.foo`.
- Import from `'solid-js'` and `'solid-js/web'`, never from `'react'` or `'preact'`.
- Use `createSignal()` for reactive state, `createEffect()` for side effects.

## Evaluation Criteria

After all stages, the game is evaluated on:

1. **Build correctness**: TypeScript compiles, Vite bundles successfully
2. **Completeness**: All stages applied, no placeholder files remain
3. **GPS compliance**: Core verb referenced, state count within limits, step function pure, TTI target met
4. **Code quality**: State flow validation, button state transitions, abort/restart safety
5. **UI/UX**: Feedback clarity, text quality, font readability
6. **Performance**: No per-frame object creation, proper cleanup in destroy()
7. **Security**: No sensitive data in localStorage, state validation on load

## Execute

```sudolang
fn whenWritingGameCode() {
  Constraints {
    Every file is a complete implementation — no TODOs, no stubs, no "implement later" comments
    TypeScript strict mode with explicit return types on all exported functions
    step(state, action) is pure: no Pixi imports, no Math.random(), no side effects, no DOM access
    Entity names match the GDD — never use generic names like "Entity", "Item", "Thing"
    Scoring formula matches the design doc exactly — not a simplified version
    Build validation: bun run typecheck && bun run build must pass after every stage
    Write checklists/stage-N.md with specific details before coding
    Re-read design docs at the start of every stage — never code from memory after stage 3
  }
}
```

### Exit Criteria (Given/Should)

- Given any .ts file is searched for "TODO", "FIXME", "implement", "placeholder", should find zero matches
- Given bun run typecheck is run, should produce zero errors
- Given bun run build is run, should produce a successful build with zero warnings
- Given step() is imported in a Node.js test (no DOM), should compile and run without errors
- Given the codebase is searched for Math.random() inside step/state files, should find zero matches
- Given entity variable names are inspected, should match GDD terminology (not generic names)
- Given the scoring function is called with known inputs, should produce the exact value from the design formula
- Given checklists/ directory is listed, should contain one file per completed build stage
