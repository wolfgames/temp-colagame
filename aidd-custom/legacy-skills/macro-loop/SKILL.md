---
name: macro-loop
description: Progression systems and difficulty curves. Use when implementing progression, difficulty scaling, bot policies, or replay functions. Triggers on: macro loop, progression, difficulty curve, bot policy, replay, unlock milestones, session tracking, multiplicative scoring, greedy bot, random bot.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Macro Loop -- Progression and Compulsion

The macro loop wraps proven levels into a progression system that creates "one more level" compulsion. It adds difficulty scaling, scoring with multiplier cascades, and long-term motivation. This stage answers: why would a player come back tomorrow?

## Progression System

### Difficulty Curve: Escalate + Breathe
Difficulty must ESCALATE gradually with periodic BREATHE levels for relief.

```
Difficulty
    ^
    |     /\    /\    /\
    |    /  \  /  \  /  \   <- escalate
    |   /    \/    \/    \  <- breathe
    |  /                  \
    +------------------------> Level
```

**Pattern**: Every 3rd level is a relief level. After a hard challenge, give the player a win to rebuild confidence before the next escalation.

### Mastery Arc
```
Novice -> Competent -> Master
```

- **Novice** (levels 1-5): Learning mechanics, generous scoring, simple layouts
- **Competent** (levels 6-15): Combining mechanics, standard scoring, moderate complexity
- **Master** (levels 16+): Mastery challenges, score multipliers matter, expert layouts

### Unlock Milestones
Create tangible progression markers:
- New mechanic unlocks (e.g., new piece type at level 5)
- Visual rewards (e.g., new theme at level 10)
- Challenge modes (e.g., timed mode at level 15)
- Milestones should feel meaningful, not just incrementing counters

### Daily Session Target
Design for 5-10 minute sessions. A player should be able to complete 3-5 levels per session and feel satisfied.

## Scoring with Multiplicative Cascade

### Balatro-Viral Model
Scoring uses multiplicative stacking, NOT additive:

```
final_score = base_points * streak_multiplier * chain_multiplier * risk_bonus
```

### Score Components
| Component | Type | Description |
|-----------|------|-------------|
| Completion | Base | Points for solving the level |
| Speed | Multiplier | Bonus for finishing quickly |
| Streak | Multiplier | Consecutive correct actions (multiplicative!) |
| Chain | Multiplier | Connected combos in a single sequence |
| Risk | Multiplier | Bonus for choosing harder paths |
| Accuracy | Modifier | Penalty for wasted moves |

### Why Multiplicative Matters
- Additive: 5 combos = 5x bonus. Boring.
- Multiplicative: 5 combos = 2^5 = 32x bonus. Shareable. Creates "I could do better" compulsion.
- The gap between a good score and a great score should be dramatic.

## Bot Playability

### Why Bots Matter
- Bots validate that the game is mechanically sound
- Bots power attract mode (self-playing demo)
- Bots provide difficulty calibration data
- A game that bots can't play has broken mechanics

### Bot Policy Interface
```typescript
interface BotPolicy {
  name: string;
  selectAction(state: GameState): PlayerAction;
}
```

### Required Policies

**Random Bot** (baseline):
- Selects a random valid action each turn
- Validates that the game is playable with any input
- Should eventually reach a terminal state
- Performance baseline: any human should beat this

**Greedy Bot** (strategic):
- Evaluates candidate actions by simulating outcomes via `step()`
- Picks the action that maximizes immediate score or progress
- Should demonstrate the GDD's intended player strategies
- Should play competently enough for attract mode

### Headless Requirement
Bots must use `step()` only -- no Pixi imports, no rendering dependencies. They must work in a pure Node.js environment.

## Replay Function

Deterministic replay is essential for attract mode, debugging, and leaderboard verification.

```typescript
function replay(initialState: GameState, actions: PlayerAction[]): GameState {
  let state = initialState;
  for (const action of actions) {
    state = step(state, action);
  }
  return state;
}

function replayWithHistory(
  initialState: GameState,
  actions: PlayerAction[]
): GameState[] {
  // Returns every intermediate state -- used for attract mode rendering
}
```

### Deterministic Guarantee
`replay(state, actions)` must produce identical results every time. This is guaranteed by the pure `step()` function and seeded RNG.

## Content Contract

### Schema Validation
Level/puzzle data must match a defined schema:
- Content source: data-pack, procedural, or hybrid
- Hot-swappable: new content packs can be added without code changes
- Schema-validated: malformed content is rejected before it reaches the game

### Generation Strategy
Describe how levels/content are generated:
- Pure procedural: all levels generated from seed + tier
- Data-pack: curated level sets loaded from data files
- Hybrid: hand-crafted core levels + procedurally generated fill

## Persistence

Use the scaffold's persistence pattern:
- `createProgressService<T>()` for versioned save/load
- Track: sessions played, high score, levels unlocked, current tier
- Reset gracefully when schema version bumps

```typescript
interface ProgressionData extends BaseProgress {
  version: number;          // REQUIRED by BaseProgress
  sessionsPlayed: number;
  highScore: number;
  levelsUnlocked: number;
  currentTier: number;
}
```

## What This Stage Produces

### Files Created
- `progression.ts` -- Unlock logic, difficulty curve, session tracking (uses createProgressService)
- `replay.ts` -- Deterministic replay from action log
- `bots/types.ts` -- BotPolicy interface
- `bots/randomBot.ts` -- Random action selection bot
- `bots/greedyBot.ts` -- Greedy heuristic bot that understands the GDD's scoring

### Files Modified
- `gameState.ts` -- Add progression fields, replay action log
- `types.ts` -- Add ProgressionState, ReplayAction, BotPolicy types
- `gameController.ts` -- Wire progression into game flow

### Stage Constraints
- **All 11 gates**: After macro loop, all GPS gates must be satisfiable
- **Bot headless**: Bots use step function only, no Pixi/rendering dependencies
- **Replay deterministic**: replay(state, actions) produces identical results every time
- **Content contract**: Level/puzzle data matches GPS content schema
- **Macro char limit**: Macro loop description fits in 400 characters

### Exit Criteria
- Progression tracks sessions and unlocks
- At least 2 bot policies implemented
- Replay function reproduces game deterministically
- Content data matches schema contract
- Difficulty increases across level sequence
- All GPS gate requirements addressed
- Progression rewards feel meaningful per GDD

## Execute

```sudolang
fn whenImplementingMacroLoop() {
  Constraints {
    Level completion must advance to next level, never go directly to game over
    Breathe levels must appear at the interval specified in the design (e.g., every 3rd level)
    Unlock milestones must occur at the exact levels specified in the design
    Difficulty curve must follow escalate+breathe rhythm, not monotonic increase
    Bot policies must reach terminal state 100% of the time (random bot and greedy bot)
    Replay function must record and replay exact action sequences deterministically
  }
}
```

### Exit Criteria (Given/Should)

- Given a level is completed successfully, should advance to the next level (not game over screen)
- Given level N is a breathe level per the design, should have lower difficulty than level N-1
- Given the unlock schedule from the design, should unlock exactly those items at exactly those levels
- Given a random bot plays 100 games, should reach terminal state in 100% of them
- Given a greedy bot plays, should reach terminal state and achieve higher scores than random bot
- Given a replay is recorded from one playthrough, should reproduce identical state sequence on replay
- Given the difficulty curve is plotted, should show escalate+breathe pattern (not monotonic)
- Given persistence is wired, should save and restore progress across page reloads
