---
name: meso-loop
description: Level design with Ki-Sho-Ten-Ketsu structure. Use when designing levels, state machines, scoring formulas, or win/lose conditions. Triggers on: meso loop, level design, state machine, scoring formula, Ki-Sho-Ten-Ketsu, level status, win condition, lose condition, social artifact.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Meso Loop -- Level Design

The meso loop wraps the atomic verb into a complete level -- with setup, challenge, climax, win/lose conditions, and a social artifact. This stage turns a toy into a game. Without it, the player has no goal.

## Ki-Sho-Ten-Ketsu Level Structure

Every level follows this four-act dramatic arc:

### Ki (Setup)
- Establish rules, player orients
- Simple layout, clear objectives
- Player learns what matters in this level
- Duration: ~25% of level time

### Sho (Development)
- Layer complexity, add wrinkles
- New challenges emerge from the established rules
- Player develops strategies
- Duration: ~25% of level time

### Ten (Twist)
- Crisis moment, paradigm shift
- Time pressure, unexpected challenge, stakes escalate
- The "oh no" moment that creates tension
- Duration: ~25% of level time

### Ketsu (Resolution)
- Win or lose, summary, emotional release
- Tease next level
- Social artifact generated
- Duration: ~25% of level time

## State Machine Design

### GPS Limits
- Maximum **12 states**
- Maximum **30 transitions**
- All paths must reach a terminal state -- no softlocks

### Typical Game States
```
READY -> PLAYING -> WON
                 -> LOST
                 -> PAUSED -> PLAYING (resume)
                           -> READY (restart)
```

Track state with a `LevelStatus` enum in types.ts:
```typescript
type LevelStatus = 'ready' | 'playing' | 'won' | 'lost' | 'paused';
```

### Transition Safety
- Every state must have at least one outgoing transition
- Terminal states (WON, LOST) lead to level-end handling
- PAUSED state must be reachable from PLAYING (pause button or focus loss)
- No state should be unreachable from the initial state

## Scoring Formula

### Deterministic Requirement
Scoring must be a pure function of player actions. No random bonuses, no time-of-day modifiers.

### Score Components
Design scoring around what the GDD values:
- **Completion**: Did you solve it? Base score for success.
- **Speed**: How fast? Bonus for efficiency.
- **Streak**: Consecutive successes? Multiplicative, not additive.
- **Risk**: Did you take the harder path? Multiplier for difficulty.
- **Accuracy**: How precise were your actions? Penalty for wasted moves.

### Multiplicative Cascade (Balatro-viral model)
```
final_score = base * streak_multiplier * chain_multiplier * risk_multiplier
```

This creates exponential reward for skilled play. A player who chains 5 combos doesn't get 5x -- they get something like 2^5 = 32x. This is what makes scores shareable and creates "I could do better" compulsion.

### Tie Breaking
When two players achieve the same score, break ties deterministically:
- Fewer moves wins
- Faster completion wins
- Earlier completion wins

## Social Artifact Contract

The social artifact is what gets shared. It proves skill without spoiling content.

### Hard Gate: No Spoilers
The artifact must NOT reveal puzzle answers. A viewer should see proof of achievement without knowing the solution.

### Artifact Types
| Type | Description | Example |
|------|-------------|---------|
| proof_of_knowledge | Shows you know something | Emoji grid showing pattern without answers |
| certify | Certifies achievement | Score receipt with stats |
| transfer | Passes a challenge | "Can you beat my score?" with seed |

### Curiosity Hook Template
Max 280 characters. Creates desire to play:
```
"I sorted 4 groups in 12 moves. Can you beat that?"
"Level 7 in 0:42. That twist got me."
```

## Level Data Design

### Quality Bar
Each level should feel hand-crafted, not auto-generated:
- Level 1 introduces the core mechanic simply
- Level 2 adds one twist or complication
- Level 3+ combines mechanics and increases complexity
- Names or themes should reflect the GDD's narrative world

### Progressive Difficulty
Design at least 3-5 levels following the Ki-Sho-Ten difficulty curve:
- **Level 1 (Ki-level)**: Teach the basics. Guaranteed solvable. Player cannot fail.
- **Level 2 (Sho-level)**: Test understanding. Add one complication. Failure possible but unlikely.
- **Level 3+ (Ten-level)**: Require mastery. Combine mechanics. Challenge the player.

### Level Data Structure
```typescript
interface LevelDef {
  id: number;
  name: string;
  // Game-specific fields from GDD:
  // grid dimensions, target count, time limit, item categories,
  // piece set, obstacle layout, etc.
}
```

## What This Stage Produces

### Files Created
- `levels.ts` -- 3-5 hand-crafted level definitions with progressive difficulty

### Files Modified
- `gameState.ts` -- Extend with levelId, turnCount, levelStatus, win/lose logic
- `types.ts` -- Add LevelDef, LevelStatus types
- `screens/gameController.ts` -- Add level lifecycle: load level -> play -> win/lose -> next level

### Stage Constraints
- **GPS state ceiling**: State machine must have 12 or fewer states, 30 or fewer transitions
- **Deterministic scoring**: Score calculation is a pure function of game actions
- **Social no spoilers**: Social artifact must not reveal puzzle answers
- **Extend don't replace**: Build on top of micro loop files. Do not rewrite GameState from scratch.
- **Loop char limits**: Meso loop description fits in 200 characters

### Exit Criteria
- Player can start and complete a level
- Win and lose conditions function correctly
- Score is calculated deterministically
- State machine has 12 or fewer states
- Level data has at least 3 levels with progressive difficulty
- Level transitions update state layer
- Level data reflects GDD mechanics, not trivial test data

## Scaffold Integration

The pure game logic lives in `src/game/mygame/` — this is correct and by design. Here's how it connects to the scaffold:

1. **Pure step function** (`src/game/mygame/gameState.ts`) — no Pixi, no DOM, no side effects. Testable in Node.
2. **Game controller** (`src/game/mygame/screens/gameController.ts`) — bridges step function to Pixi rendering. Must satisfy `GameController` interface from `src/game/mygame-contract.ts`.
3. **Cross-screen state** (`src/game/state.ts`) — SolidJS signals for score, level, etc. The game controller reads/writes these; ResultsScreen reads them to display final score.
4. **Contract compliance** — `mygame/index.ts` must export `setupGame` (type `SetupGame`) and `setupStartScreen` (type `SetupStartScreen`).

### File Targets
```yaml
create:
  - src/game/mygame/gameState.ts          # pure step(state, action) function
  - src/game/mygame/types.ts              # GameState, PlayerAction, LudemicEvent
modify:
  - src/game/mygame/screens/gameController.ts  # wire step function to rendering
  - src/game/state.ts                          # add game-specific signals
  - src/game/config.ts                         # update GAME_ID, GAME_SLUG, GAME_NAME
```

## Execute

```sudolang
fn whenImplementingMesoLoop() {
  Constraints {
    Level state machine must have 12 or fewer states, 30 or fewer transitions
    Scoring formula must match the design doc exactly — all multipliers, bonuses, efficiency factors
    Ki-Sho-Ten-Ketsu arc must be present: setup, develop, twist, resolve
    Social artifact must not spoil puzzle answers
    Win and lose conditions must be explicit and deterministic
    At least 3 hand-crafted level definitions with progressive difficulty
  }
}
```

### Exit Criteria (Given/Should)

- Given the state machine is enumerated, should have 12 or fewer named states
- Given all state transitions are listed, should total 30 or fewer
- Given a player completes a level with known inputs, should produce the exact score from the design formula (not an approximation)
- Given a level is inspected, should have a clear Ki-Sho-Ten structure: setup phase, development, twist moment, resolution
- Given the social artifact is generated (score/pattern/streak), should not reveal the puzzle solution
- Given 3+ level definitions exist, should show progressive difficulty (later levels have more states/constraints)
- Given a level reaches a terminal state, should be unambiguously win or lose (no ambiguous outcomes)
