# Archetype Pipeline: From Game Prompt to Reusable Archetype

How we go from a game idea to a production-tested, reusable game archetype that AI agents can build from reliably.

## The Problem

AI agents reinvent basic game mechanics from scratch every time they build a game. Each build produces different interaction code, different animation approaches, different visual styles — with varying quality. Common problems:

- Swap animations that glitch or "mirror" pieces
- Random gem shapes (circles one build, hexagons the next)
- Inconsistent timing, easing, and physics
- No cascade escalation (chain 5 feels the same as chain 1)
- Agents "improve" working code and break it

## The Three Game Prompts

Game creation uses three layered prompts, each building on the last:

### Prompt 1: Base Game Archetype

Defines the core genre mechanics — the interaction model, board structure, and fundamental game loop. This is the common foundation shared by all games of this type.

> Match-3 on an 8x8 grid with 5 colors. Players tap-swipe to swap adjacent pieces. Three or more consecutive like-colored pieces in a row or column are cleared. Empty spaces fill downward with new spawned pieces falling with gravity.

This produces the **base archetype** (`arch-match3`).

### Prompt 2: Variant Mechanic

Defines what makes this game different from the base. This is the creative differentiator — the mechanic that gives the game its identity.

> Cleared pieces merge into one piece that flies off the board in a parabola arc, colliding with another piece and converting it to the same color. The flying piece explodes, leaving the recolored piece in place. Cascades continue until no matches remain.

This produces a **variant archetype** (`arch-match3-bounce`).

### Prompt 3: Secondary Mechanics (Second Pass)

Defines pattern-busters, special pieces, power-ups, and progression mechanics that layer on top of a complete core loop. These are applied as a **separate pass** against a working game — not mixed into the initial build.

> Add special pieces: match-4 creates a line-blast piece, match-5 creates a color bomb. Include a move counter per level and a 3-star rating based on remaining moves.

**This pass has not yet been tested.** The theory is that secondary mechanics must be built against a complete, playable core loop — not designed alongside it. The core loop needs to work and feel right before layering complexity.

## The Process (What We Actually Did)

### 1. Define Core Interaction Modality + Base Archetype

Started with the fundamental question: what is the player physically doing? For match-3, the answer is **tap-swap** — tap a piece, swipe a direction, two pieces exchange positions.

Built multiple games (MatchBounce, MergeBounce, MatchBounce3) using this interaction to find the right feel. Compared them side by side.

### 2. Build a Template Code Interaction Pattern

Extracted the working interaction code into a reusable template (`interaction-templates/tap-swap/`). This is production-tested code that agents copy directly — not guidelines they reinterpret.

Key patterns discovered through iteration:

- **Ghost overlay for swap animation**: Two temporary absolutely-positioned divs slide between positions while real gems go `opacity: 0`. Avoids all CSS transition/grid conflicts. (This replaced 3 failed approaches.)
- **Animate first, commit state after**: Ghost overlays play on the current board. State changes only after animation completes (180ms).
- **CSS keyframe animations, not transitions**: Keyframes are self-contained and don't conflict with grid repositioning.
- **`key={gem.id}`**: Every gem has a stable unique ID. Never use position-based keys.
- **Cascade escalation**: Speed, bounce, and visual intensity scale with chain depth.
- **Gems fill 100% of cell**: Spacing comes from grid gap, not gem shrinking.
- **Locked visual style**: Colored rounded rectangles with radial gradients. Agents randomly invent different shapes without this constraint.

Templates use a **LOCKED vs ADAPTABLE** contract:

- **LOCKED** — do not change: CSS keyframes, timing values, gesture detection, ghost overlay pattern, drop/cascade formulas, gem visual style
- **ADAPTABLE** — change only at `// ADAPT:` markers: type names, store API, board dimensions

If an agent discovers an improvement, it does NOT apply it in the game. Improvements flow back to the template through review.

### 3. Define Conditions of Satisfaction

Created quality gate skills (`condition-*`) that define what must be true about any finished game:

| Condition | What it checks |
|-----------|---------------|
| `condition-core-interaction` | Primary interaction is intuitive in 3 seconds |
| `condition-canvas` | Pieces large enough for distinctive AI-generated art (48x48px min) |
| `condition-scoring` | Score variation supports leaderboard striation |
| `condition-animated-dynamics` | Every action gets a visible physical response |
| `condition-pattern-busters` | Pattern-breaking mechanics prevent stale boards |
| `condition-skill-curve` | Difficulty scales with player skill |

These are *what*, not *how*. They don't prescribe implementation — they define the bar.

### 4. Augment with Loop Definitions ("What Is a Game")

A game answers three questions. Each question maps to a loop, and each loop maps to a build pass:

| Question | Loop | Scope | Build Pass |
|----------|------|-------|------------|
| **"What am I doing?"** | Core loop | Moment-to-moment action | Pass 1: Base archetype + interaction template |
| **"Why am I doing it?"** | Meta loop | Session and progression | Pass 3: Medium-to-long compulsion loops |
| **"How am I admired?"** | Superfan loop | Mastery and social status | Pass 4: Prestige and competitive systems |

**Core loop** — the immediate compulsion loop: action, anticipation, feedback, proportional reward. This is what the player is *physically doing* every few seconds. Swap, match, cascade, score. The core loop must feel right before anything else is layered on. This is what our current archetypes represent.

**Meta loop** — the compelling reason to keep playing even after the core loop reward gets stale. Levels, difficulty curves, unlocks, collections, narrative progression, resource economies. These are medium-to-long compulsion loops that give the core loop *purpose* beyond itself. The meta loop is a separate build pass beyond secondary mechanics — it answers "why should I grind another round?"

**Superfan loop** — supportive reward mechanics gated by progression that only reward the best and most expert players. Peacocking (show off rare cosmetics), guilds/clans, multiplayer prestige badges, ranked leaderboards, competitive seasons. These are the systems that high-LTV hobby players and competitive gamers aspire to compete in. The superfan loop answers "how do others know I'm great at this?"

These are defined as skill files (`core-loop/`, `meta-loop/`, `superfan-loop/`) and each represents a distinct layer of the game that gets built in order.

### 5. Iterate Until Benchmark

Ran the build pipeline, played the games, identified deviations from conditions, fixed issues, and fed improvements back into templates. Repeated until we reached benchmark quality for the core loop.

This produced two locked archetypes:

| Repo | Based on | What it is |
|------|----------|------------|
| `wolfgames/arch-match3` | DefinitiveMatch | Base match-3 (tap-swap, cascade, gravity) |
| `wolfgames/arch-match3-bounce` | MergeBounce | Base + bounce/launch variant mechanic |

## Build Passes: Layered Construction

Each loop is built as a separate pass against a working game. You don't design all three loops at once — you build each layer on top of a stable foundation.

| Pass | What it builds | Input | Status |
|------|---------------|-------|--------|
| **Pass 1** | Core loop — base archetype + variant mechanic | Prompt 1 + 2, interaction template | Done (arch-match3, arch-match3-bounce) |
| **Pass 2** | Secondary mechanics — pattern-busters, special pieces, power-ups | Prompt 3 against working core loop | Not yet tested |
| **Pass 3** | Meta loop — levels, progression, resource economies, narrative | Meta loop skill against complete gameplay | Not yet built |
| **Pass 4** | Superfan loop — prestige, competitive, social, guilds | Superfan loop skill against complete game | Not yet built |

**The core principle: each pass builds against a complete, working version of the previous pass.** Secondary mechanics are layered onto a playable core loop. Meta loop wraps a game that already has satisfying moment-to-moment gameplay and variety. Superfan systems reward mastery of a game that already has progression.

Mixing passes creates noise. The core loop needs to feel right before you ask "why should I keep playing?" — and progression needs to work before you ask "how do I show off?"

## What's Next: Wrapper Templates

Games need more than a game board. They need standard UI components that surround and support the core gameplay. These are generally repurposable across game types and should be built as templates — the same way interaction templates provide locked, copyable code for gameplay.

### Planned Wrapper Templates

| Template | Purpose |
|----------|---------|
| **Title Screen** | Initial screen before pressing "Start" or "Settings" |
| **Settings Screen** | Audio/music toggle and volume controls |
| **Win Screen** | Celebratory end screen for the win state of a round |
| **Leaderboard Screen** | Display winners oriented by score |
| **Interstitial Screen** | Meta narrative display between game rounds |
| **Narrative Layer** | Overlay above the game for storytelling mid-game or on top of gameplay |
| **Notification System** | Display important game states, raise attention to elements, notify about off-screen events |
| **Navbar** | Bottom navigation for games with multiple screens |
| **Resource Indicators** | Top-bar counters for hard/soft currency and resources |

These would live alongside interaction templates in `aidd-custom/`:

```
aidd-custom/
  interaction-templates/
    tap-swap/
  wrapper-templates/
    title-screen/
    settings-screen/
    win-screen/
    leaderboard-screen/
    interstitial-screen/
    narrative-layer/
    notification-system/
    navbar/
    resource-indicators/
```

Each wrapper template follows the same LOCKED vs ADAPTABLE contract as interaction templates — production-tested code that agents copy, with explicit markers for what can change.

## Repository Structure

```
aidd-create-game-cc/                  ← the build system (fork)
  aidd-custom/
    interaction-templates/
      tap-swap/                       ← locked interaction code
    wrapper-templates/                ← locked UI component code (planned)
      title-screen/
      settings-screen/
      ...
    skills/
      condition-*/                    ← quality gates (what)
      core-loop/                      ← loop definitions
      meta-loop/
      superfan-loop/
      game-dynamics/
      ...30+ skills
  .agents/
    skills/
      wolf-create-game/
        references/phases/            ← 26 build phases

wolfgames/arch-match3                 ← base game archetype repo
wolfgames/arch-match3-bounce          ← variant game archetype repo
```

## What We Learned

1. **Agents need locked code, not guidelines.** Reference implementations get reinterpreted. Copyable code with a LOCKED contract gets used as-is.

2. **Iterate on two games, not one.** Building both MatchBounce and MergeBounce revealed what was common (the interaction template) vs what was game-specific (bounce arcs). One game can't show you that boundary.

3. **Visual style must be locked.** Without explicit constraints, agents randomly choose circles, diamonds, hexagons, or stars for gems. Lock the shape. Color alone distinguishes pieces.

4. **Conditions of satisfaction are separate from implementation.** "The interaction must be intuitive in 3 seconds" is a condition. The ghost overlay swap pattern is an implementation. Keep them separate.

5. **Improvements are evolutionary, not ad-hoc.** When an agent improves locked code during a build, that improvement goes through review before updating the template. One build's "improvement" can break the next build.

6. **Build in passes, not all at once.** Core loop first, then secondary mechanics, then meta loop, then superfan. Each pass builds on a stable, working version of the previous one. Mixing passes creates noise that makes it harder to get any single layer right. (Passes 2-4 not yet tested.)

7. **Games need wrapper templates too.** The game board is only part of a game. Title screens, settings, leaderboards, notifications — these are standard components that should be locked templates, not reinvented every build.
