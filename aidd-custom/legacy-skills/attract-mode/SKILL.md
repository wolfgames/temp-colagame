---
name: attract-mode
description: Self-playing demo with AI controller and hand pointer overlay. Use when implementing attract mode, auto-play demos, or idle screen animations. Triggers on: attract mode, demo, auto-play, idle, AI player, self-playing, hand pointer, tap to play, arcade cabinet demo.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Attract Mode -- Self-Playing Demo

Attract mode is a self-playing demo -- arcade-cabinet style -- that shows the game playing itself when nobody is interacting. Think Instagram game ad with a hand pointer playing badly. It should make someone watching think "I want to play that" and "I could do better."

## Core Design

### The Hook
The attract demo creates two simultaneous impulses:
1. **"That looks fun"** -- show the core verb in action, satisfying interactions, reward moments
2. **"I could do better"** -- show mistakes, near-misses, failure. The viewer sees a beatable player.

### Beat Sequence (15-30 seconds, loops)

| Beat | Duration | Action | Shows |
|------|----------|--------|-------|
| **Intro** | 3s | Game initializes, first move | The game world, core verb starting |
| **Competence** | 5s | AI plays well, scores points | Satisfying gameplay, rewards, juice effects |
| **Near-miss** | 3s | AI almost fails, recovers | Tension, close calls, drama |
| **Failure** | 4s | AI makes mistakes, loses | "I could do better than this" |
| **Call to action** | 5s | Game over, "TAP TO PLAY" | Invitation to take over |

### AI Play Parameters
- **Skill level**: ~60% (competent but imperfect)
- **Intentional mistakes**: Yes -- the AI should fumble visibly
- **Reaction delay**: 200ms (human-like, not instant)
- **Death is scripted**: The demo always ends in failure to create "let me try" impulse

## Hand Pointer Overlay

### Visual Design
- White hand cursor icon
- Follows the AI's input position with smooth interpolation
- Size: noticeable but not distracting

### Animations
| Core Verb | Hand Animation |
|-----------|---------------|
| Tap | Scale punch on tap (hand presses down, bounces back) |
| Swipe | Trail effect following swipe direction |
| Drag | Hand grips, moves along drag path, releases |
| Idle | Gentle hover/float animation |

### Purpose
The hand pointer shows the viewer WHAT INPUTS produce the gameplay they're seeing. It bridges the gap between "watching a game" and "understanding how to play." When they start playing, they already know the gesture.

## Technical Implementation

### Uses Replay Function
Attract mode MUST use the replay function from the macro loop stage. It does NOT create new game simulation logic.

```typescript
import { step } from './gameState';
import { replay } from './replay';

function createAttractMode(
  initialState: GameState,
  demoActions: PlayerAction[]
): AttractController {
  let playing = false;
  let frameTimer: ReturnType<typeof setInterval> | null = null;

  return {
    get isPlaying() { return playing; },

    start(renderFrame) {
      playing = true;
      let actionIndex = 0;
      let currentState = { ...initialState };

      const tick = () => {
        if (!playing) return;
        if (actionIndex >= demoActions.length) {
          // Loop seamlessly
          actionIndex = 0;
          currentState = { ...initialState };
        }
        currentState = step(currentState, demoActions[actionIndex]);
        renderFrame(currentState);
        actionIndex++;
      };

      frameTimer = setInterval(tick, 500); // Adjust timing for natural feel
    },

    stop() {
      playing = false;
      if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
    },
  };
}
```

### Curated Demo Actions
The demo action sequence should be hand-crafted, not random:
- Show the core verb in action within the first 3 seconds
- Include at least one impressive combo or chain
- Include a visible mistake (missed target, wrong placement)
- Build toward a satisfying climax moment
- End in failure (game over) to trigger "let me try"
- Keep to early-game content only -- no late-game spoilers

```typescript
export const DEMO_ACTIONS: PlayerAction[] = [
  // Hand-crafted sequence that tells a mini-story:
  // 1. Simple correct moves (show competence)
  // 2. Combo/chain (show depth)
  // 3. Near miss (show tension)
  // 4. Wrong move (show fallibility)
  // 5. Recovery attempt (show determination)
  // 6. Final failure (create "I could do better")
];
```

### Uses Real Rendering
The demo uses the actual game canvas with all visual effects:
- Stage 4 visual skin (themed graphics)
- Stage 5 sounds (audio feedback)
- Stage 6 juice (particles, shake, effects)
- NOT a separate video or pre-rendered animation

## Title Screen Integration

### Layout
```
+------------------+
|   GAME TITLE     |  <- Floating overlay
|                  |
|  [attract demo   |  <- Real game playing behind
|   running here]  |
|                  |
|  TAP TO PLAY     |  <- Pulsing call to action
+------------------+
```

### Title floats over the demo
- Game title text with drop shadow for readability
- "TAP TO PLAY" text pulses gently (opacity or scale animation)
- Everything is layered above the attract demo canvas

### Transition on Input
- Any user input (tap, key, swipe) immediately exits attract mode
- Zero delay -- instant transition to interactive title or directly to gameplay
- Attract canvas freezes and fades out
- Title screen becomes interactive

## Trigger Conditions

| Trigger | Condition |
|---------|-----------|
| **Start** | Title screen idle for 10 seconds |
| **Start** | Game over screen idle for 15 seconds |
| **Start** | Explicit invoke (debug/demo mode) |
| **Exit** | Any tap anywhere |
| **Exit** | Any keyboard key |
| **Exit** | Any swipe gesture |

## Content Safety

- Show early content only -- no late-game spoilers
- Don't reveal puzzle solutions or secret mechanics
- The demo should make the game look accessible, not intimidating
- Difficulty should look moderate (not trivially easy, not impossibly hard)

## Scaffold Integration

Attract mode runs inside the **start screen**, not the game screen. The start screen has access to everything needed:

- `deps.coordinator` — for loading scene bundles (sprites for the demo)
- `deps.initGpu()` — initialize GPU if attract uses Pixi rendering
- `deps.loadCore()` / `deps.loadBundle()` — load assets for the demo

### Implementation Pattern

1. Create `src/game/mygame/attractMode.ts` — the self-playing controller
2. Modify `src/game/mygame/screens/startView.ts` — mount attract behind the title UI
3. Attract starts after idle timeout (10-15s), any user input exits and returns to interactive title

### File Targets
```yaml
create:
  - src/game/mygame/attractMode.ts        # AI controller + demo sequence
modify:
  - src/game/mygame/screens/startView.ts  # mount attract, wire idle timeout
```

## What This Stage Produces

### Files Created
- `attractMode.ts` -- Demo driver using replay function + curated action sequence + hand pointer

### Files Modified
- `startView.ts` -- Mount attract canvas behind title, auto-play loop on idle
- `StartScreen.tsx` -- Pass renderer to startView for attract mode canvas

### Stage Constraints
- **Uses replay function**: Must use replay_fn from macro stage, not a separate simulation
- **Uses real rendering**: Demo renders through the actual game canvas
- **Tap to play**: Any user interaction exits attract and starts real game
- **Loops seamlessly**: Demo loops back to start without flicker
- **No new game logic**: Attract mode reuses existing game code entirely

### Exit Criteria
- Attract mode plays game automatically
- Demo uses replay function with curated actions
- Tap anywhere exits attract and starts game
- Demo loops seamlessly
- Title text overlays the demo
- Attract mode demonstrates core verb
- Demo showcases satisfying gameplay moments (combos, rewards, failure)

## Execute

```sudolang
fn whenImplementingAttractMode() {
  Constraints {
    Demo must loop every 15-30 seconds
    AI must play competently but imperfectly — not optimal play
    Must include a scripted failure beat where the AI dies/fails dramatically
    Hand pointer overlay must visualize where the AI is "tapping"
    Any user input must exit attract mode immediately
    Uses the replay system to play curated action sequences
    Beat sequence must follow: intro → competence → near-miss → failure → call-to-action
  }
}
```

### Exit Criteria (Given/Should)

- Given the title screen is idle for the trigger duration, should start the attract mode demo
- Given the demo is playing, should loop within 15-30 seconds
- Given the AI is playing, should make at least one visible mistake or suboptimal move
- Given the demo reaches the failure beat, should show the AI failing dramatically (not gracefully)
- Given a hand pointer overlay is rendered, should track the AI's input positions
- Given the user taps anywhere during the demo, should exit attract mode immediately and show the title screen
- Given the demo's action sequence is inspected, should use the replay system (not live AI decision-making)
- Given the beat sequence is observed, should follow: intro → competence → near-miss → failure → call-to-action
