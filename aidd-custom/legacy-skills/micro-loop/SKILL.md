---
name: micro-loop
description: Core verb design for tap/swipe/drag games. Use when implementing the atomic player interaction, pointer event routing, or pure game state functions. Triggers on: micro loop, core verb, tap mechanic, swipe mechanic, drag mechanic, GameState.step, pointer events, pure state function, entity design.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Micro Loop -- Core Verb Design

The micro loop is the atomic ludeme -- the single verb the player performs. It must feel good on its own, with no menus, no score, no levels. Just the verb.

## The Miyamoto Test

Remove all targets from the game. Is just performing the verb fun? If moving a piece around the screen feels satisfying before there's any goal, the micro loop is working. If the verb only becomes interesting when combined with rules, the micro loop needs more work.

## Core Verb Mechanics

The player's input MUST be one of three GPS-approved verbs:

### Tap
- **Pointer event**: `pointerdown` on entity
- **Feel**: Instant, decisive, crisp
- **Best for**: Selection, activation, categorization
- **Example archetypes**: pattern_decoder (tap to categorize), match-3 (tap to select)

### Swipe
- **Pointer events**: `pointerdown` + `pointermove` + `pointerup` with velocity detection
- **Feel**: Fluid, directional, satisfying arc
- **Best for**: Directional actions, flicking, clearing
- **Swipe detection**: Track velocity from pointermove events. Trigger swipe when velocity exceeds threshold on pointerup.

### Drag
- **Pointer events**: `pointerdown` ANYWHERE on stage + `pointermove` (piece tracks pointer) + `pointerup` (commit action)
- **Feel**: Tactile, precise, weighty
- **Best for**: Placement, positioning, routing
- **CRITICAL**: For drag-based games (especially drop-puzzle / Suika-style), the hit area for `pointerdown` must be the ENTIRE stage or board area, NOT just the falling piece sprite. Players expect to tap anywhere to position and release to drop. Do NOT gate `pointerdown` on a hit-distance check against the piece -- that makes the game feel broken.

## Pure State Function

The heart of the micro loop is `step(state, action) -> new_state`.

### Contract
```
signature: step(state: GameState, action: PlayerAction): GameState
```

### Constraints
- **No Pixi imports** -- step function must work in Node.js without a renderer
- **No Math.random()** -- use seeded RNG if randomness needed
- **No side effects** -- no sound calls, no DOM manipulation, no console.log
- **Returns new state object** -- do not mutate the input state
- **Handles ALL interactions** from the GDD's core gameplay loop, not just one action type

### Ludemic Events

The step function doesn't trigger events directly. Instead, a separate `getEvents(prev, next)` function compares the previous and next state to detect ludemic moments:

```
getEvents(prev: GameState, next: GameState): LudemicEvent[]
```

Event types:
- `REWARD` -- player did the right thing (match, score, progress)
- `COLLIDE` -- entity interaction occurred
- `FAIL` -- wrong action taken
- `EXTEND` -- flow continuation, momentum maintained
- `TEACH` -- new concept encountered

These events are consumed downstream by sound (stage 5) and juice (stage 6).

## Input -> State -> Render Loop

The micro loop follows a strict unidirectional data flow:

```
Pointer Event -> PlayerAction -> step(state, action) -> new GameState -> render(state)
```

1. **Input layer**: Pixi pointer events on stage or entities
2. **Action creation**: Translate pointer event to a typed PlayerAction
3. **State transition**: Pure step function produces new state
4. **Rendering**: Sync Pixi display objects to the new state
5. **Event detection**: Compare prev/next state for ludemic events

### Pointer Event Routing

```
app.stage.eventMode = 'static';  // Root receives events

// For tap games:
entity.eventMode = 'static';
entity.on('pointertap', (e) => {
  const action: PlayerAction = { type: 'tap', x: e.globalX, y: e.globalY };
  const prev = gameState;
  gameState = step(gameState, action);
  render(gameState);
  const events = getEvents(prev, gameState);
  // Fire events for sound/juice (wired in later stages)
});

// For drag games:
app.stage.on('pointerdown', (e) => { /* begin drag */ });
app.stage.on('pointermove', (e) => { /* update position */ });
app.stage.on('pointerup', (e) => { /* commit action */ });
```

## Entity Design

Every entity needs three layers of intent (from the LISA spec):

| Layer | Question | Example |
|-------|----------|---------|
| Mechanical | What happens? | Piece snaps to grid position |
| Strategic | Why care? | Completing a row clears it and scores points |
| Narrative | What it feels like? | Satisfying click into place, sense of order emerging from chaos |

### Entity Properties
- **Name**: Use GDD terminology, not generic placeholders (`TetrominoPiece`, not `Entity`)
- **Role**: player, target, obstacle, boundary
- **Behavior**: How it responds to the core verb
- **Visual hint**: Shape/color should suggest what the entity does before interaction

## State Design

The GameState should capture the full richness of the GDD's design:

**NOT acceptable**:
```typescript
interface GameState { x: number; y: number; score: number; }
```

**Expected**:
```typescript
interface GameState {
  board: Cell[][];           // The actual game board from GDD
  activePiece: Piece;        // Named after GDD's entity
  nextPieces: Piece[];       // Queue of upcoming pieces
  phase: GamePhase;          // Current interaction phase
  seed: number;              // For deterministic RNG
}
```

## What This Stage Produces

### Files Created
- `types.ts` -- GameState interface, PlayerAction union, LudemicEvent types (named after GDD entities)
- `gameState.ts` -- Pure step function, createInitialState, getEvents

### Files Modified
- `screens/gameController.ts` -- Replace demo content with real entities, input handling, render loop
- `startView.ts` -- Update branding to match GDD
- `config.ts` -- Set game identity from GDD

### Stage Constraints
- **NO menus** -- no title screen, no buttons. Just the core loop on canvas.
- **NO score display** -- reward is implicit visual feedback only.
- **NO levels** -- single infinite sandbox, no level progression.
- **NO sound** -- silent. Audio is wired in the sound stage.
- **NO juice** -- no particles or animations. That comes in the juice stage.
- **NO keyboard/mouse movement** -- GPS input only (tap/swipe/drag via pointer events).

### Exit Criteria
- Player entity renders on the game canvas
- Core verb input handler responds within 1 frame
- Step function is pure and deterministic
- Target entities render and respond to interaction
- At least 3 sample targets in data file
- TypeScript compiles without errors
- Entities named after GDD concepts, not generic placeholders
- Time to interactive under 3 seconds

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
fn whenImplementingMicroLoop() {
  Constraints {
    Core verb must be exactly one of: tap, swipe, drag via pointer events
    step(state, action) must be a pure function with no Pixi imports, no Math.random(), no side effects
    GameState interface must use GDD entity names, not generic placeholders
    Pointer event routing must use eventMode = 'static' on interactive elements
    For drag games, pointerdown hit area must be the entire stage, not just the piece sprite
    getEvents(prev, next) detects ludemic moments by comparing state — no direct event triggering in step()
    No menus, no score display, no levels, no sound, no juice at this stage
    All entities must have mechanical, strategic, and narrative intent layers
  }
}
```

### Exit Criteria (Given/Should)

- Given the game is running, should render the player entity on canvas within 3 seconds
- Given a pointer event matching the core verb, should produce a PlayerAction and call step()
- Given step(state, action) is called, should return a new GameState without mutating the input
- Given step() is imported into a Node.js test file, should compile without any Pixi.js dependencies
- Given Math.random is monkey-patched to throw, should still run without errors (uses seeded RNG or no randomness)
- Given getEvents(prev, next) is called after a state transition, should return at least one LudemicEvent for meaningful interactions
- Given the GameState interface is inspected, should use entity names from the GDD (not "Entity", "Thing", "Item")
- Given the code is searched for setTimeout/setInterval/requestAnimationFrame in step(), should find zero matches
- Given at least 3 sample target entities exist in a data file, should all render and respond to the core verb
