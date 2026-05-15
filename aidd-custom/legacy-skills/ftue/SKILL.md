---
name: ftue
description: First-time user experience with guided tutorial play. Use when implementing tutorials, hint systems, or onboarding flows. Triggers on: FTUE, tutorial, onboarding, first time, hints, guided play, spotlight, hand pointer, skip tutorial, first-run detection.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# FTUE -- First Time User Experience

The FTUE teaches the game through guided play -- not text walls. A brand new player should understand and enjoy the game within 30 seconds. The ultimate test: hand your phone to a non-gamer, say nothing -- they should be playing correctly within 30 seconds.

## Nintendo Tutorial Design Philosophy

```
Present one concept at a time in a safe environment.
Let the player discover the mechanic through a guided action.
Celebrate each successful step with immediate feedback.
Never break flow -- the tutorial IS gameplay, not a separate mode.
```

Miyamoto's principle: the level IS the tutorial. Show, don't tell.

## Tutorial Flow (30-Second Target)

### Step Sequence (max 7 steps)

| Step | Teaches | Hint Type | Success Condition |
|------|---------|-----------|-------------------|
| 1 | Core input | Hand gesture + spotlight | Player performs the action |
| 2 | Goal | Arrow + brief text | Player reaches the objective |
| 3 | Challenge | Spotlight + brief text | Player overcomes an obstacle |
| 4 | Completion | None (player should understand) | Player completes the sequence |

### What Each Step Teaches
1. **Core verb**: "This is how you interact" (tap here, swipe this way, drag to there)
2. **Goal**: "This is what you're trying to do" (match colors, fill the grid, route the path)
3. **Challenge**: "This is what makes it tricky" (obstacles, time pressure, limited moves)
4. **Completion**: Player handles it independently. Tutorial fades out.

### Timing
- Player's hands must move within **5 seconds** of first play
- One concept at a time -- teach one thing, let them succeed, then add next
- First attempt in tutorial MUST succeed -- no fail state
- Total tutorial: 30 seconds maximum

## Hint System

### Hint Types
| Type | Visual | Best For |
|------|--------|----------|
| **Spotlight** | Dim overlay with circular cutout | Highlighting interactive elements |
| **Hand gesture** | Animated hand pointer showing the action | Teaching tap/swipe/drag |
| **Arrow** | Directional indicator | Showing where to go |
| **Text bubble** | Short text near the target | Brief contextual instruction |

### Hint Rules
- **Max 5-8 words per hint**. Icons over words.
- Initial hint delay: 2000ms (let player try on their own first)
- Repeat hint delay: 5000ms (if player hasn't acted)
- Dismiss on: correct action performed
- Prompt style: coaching -- brief, friendly, contextual

### Hint Text Quality
Use the GDD's terminology:
- YES: "Place the block on the grid"
- NO: "Interact with the entity in the target zone"
- YES: "Swipe to match colors"
- NO: "Perform the core verb action"

## Tutorial Overlay Implementation

### Spotlight Effect
```typescript
// Dim everything except the target
overlay.rect(0, 0, stageWidth, stageHeight);
overlay.fill({ color: 0x000000, alpha: 0.6 });
// Cut out the spotlight area
overlay.circle(target.x, target.y, target.radius);
overlay.cut();
```

### Layer Structure
The tutorial overlay renders ON TOP of the real game:
```
Layer 4: Hint text + hand pointer (interactive)
Layer 3: Spotlight overlay (blocks non-target input)
Layer 2: Game entities (real game running underneath)
Layer 1: Background
```

### Hand Pointer Animation
- White hand cursor icon
- Animates the gesture (tap bounce, swipe trail, drag path)
- Positioned near the target element
- Disappears when player performs the action

## Tutorial Level Modifications

The first level during tutorial should be simplified:
- **Simplified layout**: Fewer elements, clearer arrangement
- **Reduced obstacles**: Remove or minimize challenges
- **Guaranteed first win**: The tutorial level cannot be lost
- **Staged complexity**: Each tutorial step reveals one more game element

## Skip Mechanism

### Always Available
- Small corner button: "Skip" or X icon
- Tapping skip dismisses the entire tutorial immediately
- Auto-skip: if player acts correctly before hints appear, skip that step

### Returning Players
- First-run detection: localStorage `hasPlayed` flag
- Tutorial only shows on first play
- Returning players go straight to gameplay

```typescript
const STORAGE_KEY = 'tutorial_completed';

// Check on game start:
if (getStored(STORAGE_KEY, false)) {
  // Skip tutorial, go to normal gameplay
} else {
  // Start tutorial
  // On completion: setStored(STORAGE_KEY, true);
}
```

## Seamless Integration

### The Tutorial IS the Game
- Tutorial runs inside the real game screen (GameScreen), not a separate screen
- Uses the real game skin (visual theme from visual design stage)
- Game logic is running -- the tutorial just constrains and guides the player
- Transition from tutorial to free play is seamless (overlay fades, player continues)

### Integration with Game Controller
```typescript
import { createTutorial } from './tutorial';

const tutorial = createTutorial();

// After game entities are set up:
if (tutorial.isActive) {
  const steps: TutorialStep[] = [
    {
      target: { x: entityX, y: entityY, radius: 40 },
      hint: 'Tap here!',
      waitForAction: 'tap'
    },
    // ... more steps from GDD
  ];
  tutorial.start(app.stage, steps);
}

// In the input handler, after a successful action:
if (tutorial.isActive) {
  tutorial.advance();
}
```

## What This Stage Produces

### Files Created
- `tutorial.ts` -- Tutorial step definitions, spotlight rendering, hint display, skip logic

### Files Modified
- `gameController.ts` -- Integrate tutorial: check first-run flag, wire steps, advance on success

### Stage Constraints
- **Guided play**: Tutorial teaches by DOING, not by reading. Minimal text.
- **Core verb focus**: Tutorial MUST cover the core verb (tap/swipe/drag)
- **Skippable**: User can skip tutorial at any time
- **First time only**: Tutorial only shows on first play (persisted flag)
- **Max 7 steps**: Tutorial must complete in 7 or fewer guided steps
- **Uses real game**: Tutorial runs on the real game, not a separate mode
- **Themed**: Tutorial overlay uses theme palette and typography

### Exit Criteria
- Tutorial teaches core verb through guided action
- Spotlight highlights interactive elements
- Tutorial completes in 7 or fewer steps
- Skip button dismisses tutorial
- Tutorial does not show on subsequent visits
- Tutorial uses juice feedback on success (particles, sound)
- Tutorial text references GDD terminology
- 30-second completion target achievable

## Execute

```sudolang
fn whenImplementingFTUE() {
  Constraints {
    Tutorial teaches through guided play, not text walls
    Total tutorial duration under 30 seconds
    Maximum 7 tutorial steps
    Must be skippable (skip button always visible)
    First-time only — do not replay on subsequent visits (use localStorage flag)
    If design specifies mid-game tutorials at unlock milestones, implement those too
    Guaranteed first-level win during tutorial (disable fail conditions or simplify level)
  }
}
```

### Exit Criteria (Given/Should)

- Given a first-time player starts the game, should enter tutorial mode automatically
- Given the tutorial is running, should complete in under 30 seconds of guided play
- Given the tutorial steps are counted, should total 7 or fewer
- Given the skip button is tapped at any tutorial step, should exit tutorial immediately and start normal play
- Given the tutorial has been completed once, should not replay on next app launch (localStorage flag persisted)
- Given the tutorial is active, should guarantee the player wins the first level (no fail state reachable)
- Given the design specifies a mid-game tutorial at level N, should show that tutorial when level N is first reached
- Given the tutorial uses hints, should use hand gesture overlays or spotlight highlights (not text popups)
