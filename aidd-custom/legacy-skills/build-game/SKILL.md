---
name: build-game
description: Build a complete game from idea to playable product. Use when the user wants to create a new game, build a game from a prompt, turn an idea into a playable game, or run the full design-build-polish pipeline. Triggers on: build game, create game, make a game, new game, game from idea, prompt to play, build me a game, game from scratch.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Build Game — Idea to Playable Product

You are a senior game developer. Take a game idea, produce a playable, polished mobile web game. Design fast, build deep, ship quality. All effort goes into the product — not the artifacts.

## Philosophy

```
PlayerFirst: how does this feel to play?
ShipIt: a working game beats a perfect document
NintendoPolish: every interaction feels intentional and satisfying
```

## Speed Principle

Design docs are blueprints, not novels. Fill the schema, write exit criteria, move on. The game IS the deliverable. A tight 80-line design doc that feeds a great build beats a 500-line essay that took 45 minutes. Put your craft into the code.

## Scaffold Awareness

This project uses the **Amino 3-tier architecture**. Read these before touching code:

| Resource | Purpose |
|---|---|
| `src/game/mygame-contract.ts` | **Authoritative contract** — every game must satisfy these types |
| `src/game/config.ts` | Game identity, screen wiring, manifest |
| `src/game/state.ts` | Cross-screen state (SolidJS signals) |
| `src/core/INDEX.md` | What the framework provides (DO NOT EDIT core/) |
| `src/modules/INDEX.md` | Reusable building blocks |
| `src/game/INDEX.md` | Game structure + where to put new files |

### Game Contract (source of truth: `src/game/mygame-contract.ts`)

Every game must export from `src/game/mygame/index.ts`:

```typescript
setupGame: (deps: GameControllerDeps) => GameController
setupStartScreen: (deps: StartScreenDeps) => StartScreenController
```

**GameController** must implement:
- `init(container: HTMLDivElement)` — mount game into container
- `destroy()` — tear down and release resources
- `ariaText()` — reactive accessibility text
- `gameMode?: 'dom' | 'pixi'` — `'dom'` skips GPU init, `'pixi'` requires it

**GameControllerDeps** provides:
- `coordinator` — AssetCoordinatorFacade (load/unload bundles)
- `tuning` — `{ scaffold, game }` config objects
- `audio`, `gameData`, `analytics` — injected dependencies

**StartScreenController** must implement:
- `init(container: HTMLDivElement)` — mount start screen
- `destroy()` — tear down
- `backgroundColor` — CSS color for screen wrapper

**StartScreenDeps** provides:
- `goto(screen)` — navigate (`'loading'`, `'start'`, `'game'`, `'results'`)
- `initGpu()` — lazy GPU initialization
- `unlockAudio()` — browser audio unlock
- `loadCore()`, `loadAudio()`, `loadBundle()` — asset loading with progress
- `tuning`, `analytics`

### State Management

- **Cross-screen state** (score, level, progression): SolidJS signals in `src/game/state.ts`
- **Session state** (board, active piece, game-specific): Closure variables inside `gameController.init()`

### Screen IDs

`'loading'` | `'start'` | `'game'` | `'results'` — there is no `'game_over'` screen.

### Key Paths

| What | Path |
|---|---|
| Game controller | `src/game/mygame/screens/gameController.ts` |
| Start view | `src/game/mygame/screens/startView.ts` |
| Game barrel export | `src/game/mygame/index.ts` |
| Contract types | `src/game/mygame-contract.ts` |
| Game config | `src/game/config.ts` |
| Game state | `src/game/state.ts` |
| Asset manifest | `src/game/asset-manifest.ts` |
| Audio manager | `src/game/audio/manager.ts` |
| Sound definitions | `src/game/audio/sounds.ts` |
| Tuning defaults | `src/game/tuning/index.ts` |
| Tuning types | `src/game/tuning/types.ts` |
| Loading screen | `src/game/screens/LoadingScreen.tsx` |
| Start screen shell | `src/game/screens/StartScreen.tsx` |
| Game screen shell | `src/game/screens/GameScreen.tsx` |
| Results screen | `src/game/screens/ResultsScreen.tsx` |

## AIDD Framework

Read `ai/index.md` to discover available skills, commands, and rules. Use progressive discovery — drill into subfolders only when the task needs that domain.

| Resource | Use For |
|---|---|
| `ai/skills/aidd-structure/` | Project structure conventions |
| `ai/skills/aidd-service/` | Service patterns (state, persistence, audio) |
| `ai/skills/aidd-ecs/` | Entity-component-system patterns |
| `ai/skills/aidd-observe/` | Observability, logging, debugging |
| `ai/skills/aidd-fix/` | Bug diagnosis and fix workflows |
| `ai/skills/aidd-layout/` | Layout and responsive design |
| `ai/rules/tdd.mdc` | Test-driven development |
| `ai/rules/review.mdc` | Review standards |
| `docs/factory/index.md` | Reusable commands (/debug, /plan, /task, /commit, etc.) |

---

## Phase 1: Design (fast)

Produce 4 design docs via sub-agents. Run `aidd-custom/skills/design/SKILL.md` — it has the full execution sequence, dependency graph, sub-agent template, and quality gates.

---

## Phase 2: Build (where the effort goes)

CONSTRAINT: do not begin until Phase 1 is complete.

Build incrementally. Each stage produces a working game before the next starts.

### Sub-Agent Delegation

Context compaction kills fidelity. Delegate each build stage to a sub-agent with fresh context.

```
"Implementing stage N (Stage Name).
 Read: design/01-core-identity.md (GDD section), design/XX-relevant.md, checklists/stage-N.md
 Read: src/game/mygame-contract.ts (authoritative contract)
 Read: ai/skills/ relevant AIDD skills for this stage
 Read existing codebase in src/game/
 Implement per aidd-custom/skills/{stage-skill}/SKILL.md
 Test: bun run test
 Build: bun run typecheck && bun run build
 Verify every checklist item passes."
```

### Checklists (survive compaction)

At each stage start, write `checklists/stage-N.md` extracting every specific value from the design doc — shapes, colors, formulas, algorithms, level numbers. Re-read the checklist, not your memory.

### Build Stages

1. **Scaffold** — Configure `src/game/config.ts` from GDD (GAME_ID, GAME_SLUG, GAME_NAME). Update `src/game/state.ts` with game-specific signals. Read `aidd-custom/skills/scaffold-profiles/SKILL.md`.
2. **Micro Loop** — Core verb. Pure `step(state, action)` in `src/game/mygame/`. Pointer events. Entity rendering. No UI. Read `aidd-custom/skills/micro-loop/SKILL.md`.
3. **Meso Loop** — Level structure. State machine. Deterministic scoring. Exact formula from design. Read `aidd-custom/skills/meso-loop/SKILL.md`.
4. **Level Gen** — Generation strategy from design (backward-construction = backward-construction, not shuffle). Solvability validator. Seeded RNG. Read `aidd-custom/skills/level-generation/SKILL.md`.
5. **Macro Loop** — Progression, breathe rhythm, unlocks at exact levels, bot policies, replay_fn, persistence. Level complete → next level, NOT results. Read `aidd-custom/skills/macro-loop/SKILL.md`.

**── MID-BUILD GATE ──**
Re-read design/01-core-identity.md + design/02-game-loops.md + all checklists. Grep codebase for each item. Fix drift before polish stages.

6. **Visual Design** — Read render code first, compare to design, replace placeholders with exact spec. Read `aidd-custom/skills/visual-design/SKILL.md`.
7. **Sound** — SFX wired to every ludemic moment. Read `aidd-custom/skills/sound-design/SKILL.md` (jsfxr) OR `aidd-custom/skills/sound-design-elevenlabs/SKILL.md` (AI-generated, requires `FAL_KEY`).
7b. **Music** _(optional)_ — AI-generated background music via MiniMax Music 2.0. Read `aidd-custom/skills/music-generation/SKILL.md` (requires `FAL_KEY`).
8. **Juice** — Particles, shakes, popups per feedback tier. GSAP tweens. Layers on top — never modify state. Read `aidd-custom/skills/juice/SKILL.md`.
9. **Lifecycle** — Start, pause, results, settings. Max 2 taps to play. localStorage persistence. Modify existing `ResultsScreen.tsx`, do NOT create a GameOverScreen. Read `aidd-custom/skills/game-lifecycle/SKILL.md`.
10. **FTUE** — Tutorial through doing. 30s phone test. Skippable. First-time only. Read `aidd-custom/skills/ftue/SKILL.md`.
11. **Attract Mode** — Self-playing demo. Scripted failure beat. Hand pointer. Any input exits. Read `aidd-custom/skills/attract-mode/SKILL.md`.
12. **Validate** — Full fidelity audit against all design docs and checklists. Fix remaining issues.

### Testing

Follow `ai/rules/tdd.mdc`. Pure game logic is trivial to test — no excuses.

**Per stage:** Write unit tests for every pure function before implementing it. Game state (`step()`), scoring formulas, level generation, solvability validators, progression logic, and seeded RNG are all deterministic — test them.

**Test command:** `bun run test` — must pass before moving to the next stage.

### Build Quality Gates

Non-negotiable per stage:
- No stubs, no TODOs, no placeholders
- TypeScript strict with explicit return types
- Pure `step(state, action)` — no render, no Math.random(), no side effects
- Deterministic — same inputs = same state (seeded RNG if needed)
- GDD faithful — names, formulas, visuals match design
- Contract faithful — `setupGame` and `setupStartScreen` satisfy `mygame-contract.ts`
- Tests pass: `bun run test`
- Build passes: `bun run typecheck && bun run build`

### Drift Detection

When code doesn't match a checklist item:

```
1. UNIT:     What's wrong?
2. EXPECTED: What does the design doc say? (quote it)
3. ACTUAL:   What does the code do? (show the line)
4. DIFF:     Gap between expected and actual
5. FIX:      Minimal change to close the gap
```

### Common Drift

| Drift | Fix |
|---|---|
| Shape substitution | Re-read visual design, draw specified shape |
| Color count wrong | Re-read macro loop, implement full set + unlocks |
| Algorithm simplified | Re-read level-gen, implement actual algorithm |
| Scoring shortcuts | Re-read meso loop, implement full formula |
| Level complete → results immediately | Wire level advancement per macro loop |
| No breathe rhythm | Implement Nth-level easier pattern |
| Missing pause | Add pause button + overlay |
| Particle shape mismatch | Match particles to visual vocabulary |
| Wrong screen ID | Use `'results'` not `'game_over'` |
| Wrong deps shape | Check `mygame-contract.ts`, use `GameControllerDeps` not `GameDeps` |

---

## Phase 3: Polish

Audit → fix → re-audit loop. Delegate audits to sub-agents per domain. Max 5 iterations. Read `aidd-custom/skills/polish/SKILL.md`.

### Audit Domains (parallel sub-agents)

- **Mechanics**: design/01-core-identity.md + design/02-game-loops.md vs game logic
- **Presentation**: design/03-presentation.md vs visuals, SFX, music, juice
- **Flow**: design/04-player-journey.md vs lifecycle/FTUE/attract

Each auditor reads relevant design docs + checklists + implementation code. Reports: what matches, what's partial, what's missing.

### UI Polish Passes (escalating)

**Pass 1 — Structure:** All screens present, navigable, touch targets ≥44px, no overlaps.
**Pass 2 — Fidelity:** Shapes/colors/typography match design exactly. 60fps. Consistent spacing.
**Pass 3 — Delight:** Juice on every action. Combos feel dramatic. Transitions smooth. Title has presence. Would you show this and say "I made this"?

### Quick Audit

```
"Re-read ALL design docs and checklists.
 Grep codebase for each checklist item.
 Report only issues. Skip passing items.
 Do NOT fix — just report."
```

### When to Stop

- All checklist items pass, OR
- 5 iterations reached — ship it and surface remaining issues
