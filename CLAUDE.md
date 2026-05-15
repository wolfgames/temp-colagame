Immediately read `AGENTS.md` for full agent guidelines, progressive discovery rules, and workflow context.

## Docs

All documentation lives in `docs/`. Read [`docs/INDEX.md`](docs/INDEX.md) for the full routing table.

## Guardrails

**Read [`docs/standards/guardrails.md`](docs/standards/guardrails.md) before writing any game code.**

Common mistakes that silently break games: DOM in GPU code, orphaned tweens, wrong bundle prefixes, broken event trees, per-frame allocations, and more. Each rule explains what not to do, why it breaks, and what to do instead.

---

## Archetype Pipeline Context

This section documents work done in a prior session to build a repeatable game creation pipeline. The artifacts from that work have been imported into this project. Read this before building wrapper templates, secondary mechanics, or new game features.

### What Was Built

1. **Interaction Templates** (`artifacts/interaction-templates/`) — Production-tested, locked code patterns that agents copy directly instead of reinventing.
   - `tap-swap/` — Match-3 swap interaction (gesture detection, ghost overlay animation, gravity, cascades)
   - `tap-clear/` — ClearPop tap-to-clear interaction (BFS flood-fill, pop animation, gravity, power-up thresholds)
   - Each template has a README, CSS keyframes, and a .tsx patterns file with `// ADAPT:` markers

2. **Conditions of Satisfaction** (`.cursor/skills/condition-*`) — Quality gates that define what must be true about any finished game:
   - `condition-core-interaction` — intuitive in 3 seconds
   - `condition-canvas` — pieces large enough for distinctive art (48x48px min)
   - `condition-scoring` — score variation for leaderboard striation
   - `condition-animated-dynamics` — every action gets a visible physical response
   - `condition-pattern-busters` — mechanics prevent stale boards
   - `condition-skill-curve` — difficulty scales with player skill

3. **Loop Definitions** (`.cursor/skills/core-loop/`, `meta-loop/`, `superfan-loop/`) — The three questions every game must answer:
   - **"What am I doing?"** → Core loop (moment-to-moment action)
   - **"Why am I doing it?"** → Meta loop (progression, the reason to keep playing after the core loop gets stale)
   - **"How am I admired?"** → Superfan loop (prestige, peacocking, guilds, competitive — rewards for expert players)

4. **Pipeline Documentation** (`artifacts/docs/`)
   - `archetype-pipeline.md` — Full process doc: three game prompts, five build steps, four build passes, LOCKED vs ADAPTABLE contracts
   - `game-completeness-checklist.md` — Checklist from bare archetype to shippable game (core loop → secondary mechanics → meta → superfan → wrappers → polish)

### LOCKED vs ADAPTABLE Contract

All interaction templates use a strict contract to prevent agent deviation:

- **LOCKED** — Do not change: CSS keyframes, timing values, gesture detection logic, animation patterns, scoring formulas, visual style (colored rounded rectangles with radial gradients, 100% cell fill)
- **ADAPTABLE** — Change only at `// ADAPT:` markers: type names, renderer calls, board dimensions, color key names

If you discover an improvement during a build, do NOT apply it in the game. Note it for archetype evolution — improvements flow back through review.

### Build Passes (Layered Construction)

Each layer is built against a complete, working version of the previous layer. Do not mix passes.

| Pass | What it builds | Status |
|------|---------------|--------|
| **Pass 1** | Core loop — base archetype + interaction template | Done |
| **Pass 2** | Secondary mechanics — pattern-busters, special pieces, power-ups | Not yet tested |
| **Pass 3** | Meta loop — levels, progression, resource economies, narrative | Not yet built |
| **Pass 4** | Superfan loop — prestige, competitive, social, guilds | Not yet built |

### Wrapper Templates (Next Priority)

Standard game UI components to build as locked templates. These surround the core gameplay:

| Template | Purpose |
|----------|---------|
| Title Screen | Logo, start button, settings button |
| Settings Screen | Audio/music toggle and volume |
| Win Screen | Score summary, star rating, celebration |
| Loss Screen | Retry, use booster, return to map |
| Leaderboard Screen | Global/friends/weekly, player rank |
| Interstitial Screen | Narrative between zones |
| Narrative Layer | Story overlay on top of gameplay |
| Notification System | Toast/banner for achievements, unlocks, events |
| Navbar | Bottom tab navigation for multi-screen games |
| Resource Indicators | Top bar for currency/energy counters |

### Game Archetype Repos (Reference)

These were created and pushed to GitHub during the prior session:

- `wolfgames/arch-match3` — Base match-3 (React/Vite, tap-swap)
- `wolfgames/arch-match3-bounce` — Match-3 + bounce/launch variant (React/Vite, tap-swap)
- `wolfgames/arch-clearpop` — ClearPop tap-to-clear (SolidJS/PixiJS) — NOTE: this was pushed without explicit approval, may need review

### Build System Fork

- `wolfgames/aidd-create-game-cc` — Fork of aidd-create-game with updated skills, interaction templates, and phase references. This is where the canonical skill definitions were developed before being copied into this project.

### Key Technical Discoveries

These came from iterating on multiple game builds and should inform all future work:

1. **Ghost overlay pattern for swap animation** — Two temporary absolutely-positioned divs slide between positions while real pieces go `opacity: 0`. Avoids all CSS transition/grid conflicts. (Replaced 3 failed approaches.)
2. **Animate first, commit state after** — Play animation on current board state. Commit state change only after animation completes.
3. **CSS keyframe animations, not transitions** — Keyframes are self-contained and don't conflict with grid repositioning.
4. **`key={piece.id}` not position** — Every piece needs a stable unique ID. Never use row/col as React keys.
5. **Pieces fill 100% of cell** — Spacing comes from grid gap, not from shrinking pieces. Agents randomly shrink to 85% which wastes canvas real estate.
6. **Lock visual style** — Without constraints, agents randomly invent circles, hexagons, stars. Lock as colored rounded rectangles.
7. **Score formula uses power curve** — `10 × groupSize^1.5` for tap-clear. Provides enough variation for leaderboard striation.

### User Context

The user is a game designer, not an engineer. They work on Windows 11. They use the terms core/meta/superfan loop (not micro/meso/macro or ludeme). They care about:
- Canvas real estate for distinctive game art
- Compulsion loops: action → anticipation → feedback → proportional reward
- Interaction archetypes as reusable, locked patterns
- Building in passes (core first, then layer complexity)
- Games feeling right before adding features
