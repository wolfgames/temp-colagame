---
name: game-design-system
description: GPS game design framework with LISA ludemic assembly. Use when designing a new game, creating game design documents, or evaluating game concepts. Triggers on: game idea, game design, GDD, LISA program, ludemic, GPS gates, design documents, game production system.
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# Game Design System (GPS)

The Game Production System is the overarching design philosophy for building mobile web games that players love. Every game produced through this system passes through rigorous design gates before a single line of code is written.

## LISA Program Structure

LISA (Ludemic Instruction Set Architecture) decomposes any game idea into three layers:

### Mechanical Layer
What physically happens. Operations that change game state.
- **Operations**: INPUT, MOVE, COLLIDE, SET, MOD, REWARD, TEACH, AFFORD, TRUST, INVEST, EXTEND, ESCALATE
- **State contract**: Target JSON, max 2KB
- All mechanics must be deterministic -- no `Math.random()` in state logic
- Variable content is data-driven (from data packs, not hardcoded)

### Strategic Layer
Why the player cares. Motivations that create engagement.
- **Operations**: AFFORD (offer choices), TRUST (reward consistency), INVEST (create sunk cost), EXTEND (expand mastery), ESCALATE (raise stakes)
- **Motivations**: Mastery, completion, discovery, social proof

### Narrative Layer
What emotions it creates. The feeling of play.
- **Operations**: TEACH (introduce concept), REWARD (celebrate success), TRUST (build reliability)
- **Theme tokens**: The emotional vocabulary of the game world

### Emergent Behaviors
The feedback loops that arise from layer interactions:
- REWARD -> ESCALATE -> EXTEND -> AFFORD -> more RISK
- TEACH -> TRUST -> INVEST -> deeper ENGAGEMENT
- COLLIDE -> REWARD -> ESCALATE -> higher STAKES

## Ki-Sho-Ten-Ketsu Level Structure

Every level follows a four-act dramatic arc:

| Act | Name | Purpose | Player Experience |
|-----|------|---------|-------------------|
| Ki | Setup | Establish rules | Player orients, understands the space |
| Sho | Development | Layer complexity | Add wrinkles, new challenges emerge |
| Ten | Twist | Crisis moment | Paradigm shift, time pressure, tension peak |
| Ketsu | Resolution | Win or lose | Summary, emotional release, tease next level |

This structure ensures every level tells a micro-story. The player should feel a narrative arc even in a 30-second puzzle.

## GPS Hard Gates

These are non-negotiable constraints. A game that violates any hard gate fails the production pipeline.

### Gate 1: Core Verb
- Player input MUST be one of: **tap**, **swipe**, **drag**
- No keyboard input, no mouse-specific input, no multi-touch gestures
- The verb must feel good in isolation (the Miyamoto test: remove all targets -- is just performing the verb fun?)

### Gate 2: State Machine Ceiling
- Maximum **12 states** in the game state machine
- Maximum **30 transitions** between states
- All paths must reach a terminal state -- no softlocks
- State machine must be expressible as a finite state diagram

### Gate 3: Deterministic State
- `step(state, action)` must be a **pure function**
- No render calls inside state logic
- No `Math.random()` -- use seeded RNG if randomness is needed
- Same inputs always produce same outputs

### Gate 4: Social Artifact
- The social sharing artifact must NOT spoil puzzle answers
- Types: proof_of_knowledge, certify, transfer
- Formats: emoji_grid, event_receipt, grid_silhouette
- Must include a curiosity hook (280 characters max)

### Gate 5: Time to Interactive
- TTI must be under **3 seconds**
- No heavy synchronous loading in the init path
- Player's hands must move within 5 seconds of first play

### Gate 6: Description Limits
- Micro loop description: max **200 characters**
- Meso loop description: max **200 characters**
- Macro loop description: max **400 characters**

### Gate 7: Solvability
- Every level must be generated from or validated against a known solution
- No "generate and hope" -- either build from the answer (backward construction) or validate with a solver (forward construction + verification)

### Gate 8: Scoring
- Scoring must be **deterministic** -- pure function of player actions, no random bonuses
- Use multiplicative stacking (streak x chain x risk), not just addition

### Gate 9: Bot Playability
- Game must support headless bot play via `step()` function
- At least 2 bot policies: random baseline + one strategic
- Terminal state must be guaranteed (no infinite games)
- Replay function: `replay(seed, actions) -> outcome`

### Gate 10: Content Contract
- Content source: data-pack, procedural, or hybrid
- Content must be hot-swappable and schema-validated
- Same seed + same parameters must produce the same level

### Gate 11: Playability on Mute
- Game must be fully playable with sound muted
- Sounds enhance but are never required for gameplay
- Visual feedback must be sufficient on its own

## The 11 Design Documents

Each document builds on the previous ones. Produce them in order.

| # | Document | Core Question | Key Outputs |
|---|----------|---------------|-------------|
| 1 | LISA Program | What are the game's fundamental operations? | Mechanical/strategic/narrative layers, emergent loops |
| 2 | GDD | What is this game? | Title, high concept, gameplay loop, systems, theme |
| 3 | Micro Loop | What is the atomic verb? | Core verb, step function, entities, feedback |
| 4 | Meso Loop | What is a level? | Ki-Sho-Ten-Ketsu structure, state machine, scoring, social artifact |
| 5 | Level Generation | How are levels created safely? | Generation strategy, solver, solvability proofs |
| 6 | Macro Loop | Why play another level? | Progression, difficulty curve, bots, replay |
| 7 | Visual Design | What does the game world look like? | Palette, typography, material voice, sprites |
| 8 | Sound Design | What does the game world sound like? | SFX event map, synthesis params, variation |
| 9 | Juice Plan | How does every action feel impactful? | Feedback tiers, particles, shake, combo escalation |
| 10 | Lifecycle | What wraps the gameplay? | Screen graph, session model, persistence |
| 11 | FTUE | How does a new player learn? | Tutorial steps, hints, skip mechanism |
| 12 | Attract Mode | How does the game advertise itself? | Demo sequence, AI play, hand pointer |

## GPS Archetype Library

Common game patterns with proven implementations:

### pattern_decoder_v1 (tap + category_set)
- Player categorizes items by tapping
- Forward construction: pick N non-overlapping categories, fill items
- Solvability: intersection of any two category sets must be empty

### flow_manager_v1 (drag + queue)
- Player routes items through a network
- Graph construction: build station graph, generate orders from valid paths
- Solvability: BFS/DFS reachability for each order

### grid_manipulator_v1 (drag + grid)
- Player places pieces on a grid
- Backward construction: start with solved board, extract piece sequence
- Solvability: backtracking exact cover solver

## Mechanic-Fixed / Content-Variable / Social-Artifact Thesis

The core thesis of GPS game design:
1. **Mechanics are fixed** -- the verb, the rules, the state machine. These don't change between sessions.
2. **Content is variable** -- levels, puzzles, challenges. These change to create novelty and difficulty progression.
3. **Social artifact is proof** -- the shareable output proves the player's skill without spoiling the content.

This separation ensures the game is replayable (new content), competitive (deterministic mechanics), and shareable (artifact without spoilers).

## Execute

```sudolang
fn whenDesigningAGame() {
  Constraints {
    Decompose idea into LISA mechanical, strategic, and narrative layers before writing GDD
    State contract serializes to under 2KB JSON
    Core verb is exactly one of: tap, swipe, drag — no compound inputs
    State machine has 12 or fewer states, 30 or fewer transitions
    Social artifact reveals effort, not puzzle answers
    Every design doc ends with a Given/should Exit Criteria section
  }
}
```

### Exit Criteria (Given/Should)

- Given the LISA program is complete, should have at least one opcode from each layer (mechanical, strategic, narrative)
- Given the GDD is written, should specify: title, core verb, scoring formula, entity names, color palette, progression milestones
- Given the state contract is serialized to JSON, should be under 2KB
- Given the core verb is defined, should be exactly one of: tap, swipe, drag
- Given the state machine is drawn, should have 12 or fewer states and 30 or fewer transitions
- Given the social artifact is described, should not reveal puzzle solutions or level answers
- Given all 4 design docs are complete, should each end with a Given/should Exit Criteria section
