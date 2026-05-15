---
name: game-lifecycle
description: Game screen management with title, menu, results, and pause screens. Use when implementing screen routing, session persistence, or game shell UI. Triggers on: lifecycle, game screens, title screen, results, pause, screen routing, session model, goto, persistence, settings screen.
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep, Agent, WebFetch, WebSearch, mcp__context7__*, mcp__playwright__*
---

# Game Lifecycle -- Everything Before and After Gameplay

The lifecycle wraps proven gameplay in a complete game shell -- everything the player experiences before and after playing. The title screen is the game's first impression. The results screen is the moment to hook them into "one more round."

## Screen Graph

```
TITLE --> PLAYING --> RESULTS
  |          |           |
  |          v           v
  |        PAUSED     TITLE (home)
  |          |           |
  |          v           v
  v        PLAYING    PLAYING (replay)
SETTINGS
```

### Screen Definitions

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| **TITLE** | First impression, invite to play | Game title (from GDD!), Play button, settings icon, optional attract mode |
| **PLAYING** | The game canvas with HUD | Pixi stage, score display, level indicator, pause button |
| **PAUSED** | Quick access during gameplay | Resume, restart, settings, quit options |
| **RESULTS** | Celebrate and re-engage | Final score, high score, stars/rating, Play Again, Home |
| **SETTINGS** | Player preferences | SFX volume, mute toggle, reduced motion, high contrast |

> **Note:** The scaffold provides 4 screen slots: `loading`, `start`, `game`, `results`. Do NOT create additional screen components -- customize the existing ResultsScreen for game-over display.

## Session Model

### Max 2 Taps to Gameplay
From title screen to gameplay in 2 taps maximum. This is a hard constraint.
```
Tap 1: "Play" button
Tap 2: (optional) Level select or difficulty choice
Then: gameplay begins immediately
```

### Session Phases
```typescript
type SessionPhase = 'idle' | 'playing' | 'paused' | 'complete';
```

| From | To | Trigger |
|------|----|---------|
| idle | playing | User taps Play |
| playing | paused | User taps Pause OR app backgrounds (focus loss) |
| paused | playing | User taps Resume |
| playing | complete | Win/lose condition met |
| complete | idle | User taps Replay or Home |

### Persistence
- **Score persistence**: localStorage via `getStored`/`setStored` or `createVersionedStore`
- **Settings persistence**: localStorage (volume, mute, reduced motion)
- **Progress persistence**: `createProgressService()` with versioned schema

## Title Screen Design

### Requirements
- Shows the actual game title from the GDD (not "Game Title")
- Styled with theme palette and typography from visual design stage
- Prominent Play button that invites interaction
- Optional settings access (gear icon)
- Optional high score display

### If scaffold provides StartScreen.tsx
MODIFY it rather than creating a new one. Fill in the game's branding, not generic placeholder text.

### Title Screen Idle Behavior
After 10-15 seconds of idle on the title screen, trigger attract mode (if implemented). Any user input exits attract and returns to interactive title.

## Results Screen Design

Modify existing `src/game/screens/ResultsScreen.tsx` -- do NOT create a new GameOverScreen component.

### Requirements
- Celebrates the player's performance
- Shows score prominently (large, themed typography)
- Shows high score for comparison
- Clear "Play Again" button (primary action)
- Secondary actions: Home, Share (if social artifact implemented)
- Creates "I could do better" feeling

### Score Display
```
Your Score: 12,450
Best: 18,200
```
The gap between current and best should motivate replay.

### Emotional Design
- If player achieved a new high score: celebration effects (particles, special text)
- If player improved: positive messaging ("New personal best!" or "+2,300 from last time")
- If player didn't improve: encouraging tone, not punishing

## Screen Transitions

### Style
- Between screens: fade or slide (200-400ms)
- Into gameplay: brief countdown or "Ready?" prompt
- All transitions match the game theme
- CSS transitions preferred over complex animation libraries

### Implementation
Use the scaffold's screen routing via `goto()` from `useScreen()`:
```typescript
// In StartScreen / ResultsScreen (SolidJS shell components with useScreen()):
const { goto } = useScreen();
goto('game');
goto('start');
goto('results');
```

**Important:** `goto()` is available in `StartScreenDeps` (passed to `setupStartScreen`), but `GameControllerDeps` does NOT include `goto`. The GameScreen shell reads game state (e.g. a `phase` or `complete` signal) and the shell component uses `useScreen().goto('results')` to transition when the game signals completion. The game controller itself never calls `goto` directly.

## Pause Handling

### Triggers
- Explicit: pause button tap
- Implicit: browser tab loses focus, window blur event

### Behavior
- Game state freezes (no timer advancement)
- Semi-transparent overlay over game canvas
- Resume, Restart, Settings, Quit buttons
- Resume restores exact game state

### Implementation
Manage pause inside the `init()` closure:
```typescript
// Inside gameController init():
let isPaused = false;

function pause(): void {
  isPaused = true;
  // Show pause overlay
}

function resume(): void {
  isPaused = false;
  // Hide pause overlay
}

// In game loop, check isPaused before processing actions
```

**CRITICAL**: Do NOT add pause/resume methods to the `setupGame()` return type. GameScreen.tsx calls `init()` and `destroy()` only. Pause is internal.

## Accessibility in Lifecycle Screens

- All screens are keyboard-navigable
- Focus indicators visible on interactive elements
- Screen-reader friendly labels on buttons
- Settings include:
  - SFX volume slider
  - Mute toggle
  - Reduced motion option
  - High contrast option (if applicable)

## What This Stage Produces

### Files Modified
- `src/game/screens/ResultsScreen.tsx` -- Customize existing component: score display, replay button, home button
- `src/game/mygame/screens/gameController.ts` -- Signal game completion via game state (e.g. phase signal); does NOT call `goto()` directly
- `src/game/mygame/screens/startView.ts` -- Polish title with game branding from theme

### Stage Constraints
- **Screen routing**: Use the scaffold's `goto()` system (via `useScreen()` in shell components or `StartScreenDeps`), do NOT create a custom ScreenManager
- **Themed**: All lifecycle screens use the theme palette and typography from visual design stage
- **Preserve game**: Game canvas and game logic unchanged. Lifecycle wraps around them.
- **Simple transitions**: CSS fade or slide. No complex animation libraries.
- **Use game title**: Title screen displays the actual game title from the GDD
- **setupGame contract**: `setupGame()` returns `{ init, destroy }` only. No pause/resume/restart on return type.
- **Preserve GameScreen**: Do NOT rewrite GameScreen.tsx to add new method calls

### Exit Criteria
- Title screen renders with game title from GDD
- Play button starts gameplay
- Results screen shows score
- Replay button resets and starts new session
- Screen routing handles all transitions
- Screens use theme palette and typography
- Max 2 taps from title to gameplay

## Execute

```sudolang
fn whenImplementingLifecycle() {
  Constraints {
    Screen graph must include: title, game, results, pause — minimum viable set
    Maximum 2 taps from title screen to gameplay
    Level completion transitions to next level with interstitial, NOT to game over
    Results screen only triggers on fail or explicit quit
    Pause button must be visible during gameplay and produce a pause overlay
    All scores and progress persist via localStorage across page reloads
    Use scaffold's ScreenProvider and goto() for navigation — do not rebuild routing
  }
}
```

### Exit Criteria (Given/Should)

- Given the app launches, should display the title screen
- Given the player taps "play" on the title screen, should reach gameplay in 2 or fewer taps
- Given the player completes a level, should show a level-complete interstitial then advance to the next level
- Given the player fails a level, should show the results screen (not silently restart)
- Given the pause button is tapped during gameplay, should display a pause overlay and stop game logic
- Given the pause overlay is dismissed, should resume gameplay from the exact paused state
- Given a score is achieved and the page is reloaded, should persist and display the previous score
- Given the results screen is shown, should display final score and offer replay
