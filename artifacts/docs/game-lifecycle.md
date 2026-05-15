# Game Lifecycle

The common shape of a game built from wrappers. Every game follows this lifecycle — wrappers handle the phases around the game, AI generates only the game itself.

## The Session Loop

A player session is a repeating cycle through these phases. The outer shell never changes; only the game screen content varies per archetype.

```
BOOT ─── TITLE ─── PLAY ─── OUTCOME ─── PROGRESSION ──┐
                     ▲                                  │
                     └──────────────────────────────────┘
```

Expanded with every wrapper touchpoint:

```
┌─────────────────────────────────────────────────────────────────┐
│  BOOT PHASE                                                     │
│  loading-screen → title-screen                                  │
│  Load assets, show progress, present Play button                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ [Play tapped]
                       │ unlockAudio() → initGpu() → loadAssets()
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  PLAY PHASE                                                     │
│  game screen + hud + talking-heads (optional)                   │
│  Core loop runs. ECS owns state. HUD reads from ECS bridge.    │
│  Talking heads overlay can appear during gameplay.              │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ [Goal complete]          │ [Moves exhausted]
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│  WIN OUTCOME             │  │  LOSS OUTCOME                    │
│  results screen (win)    │  │  results screen (loss)           │
│  Score, stars, celebrate │  │  Encouragement, retry prompt     │
└──────┬──────────┬────────┘  └──────┬──────────┬────────────────┘
       │          │                  │          │
       │ [Next]   │ [Menu]           │ [Retry]  │ [Menu]
       ▼          ▼                  ▼          ▼
┌─────────────┐  Title          PLAY PHASE    Title
│ PROGRESSION │  Screen         (same level)  Screen
│ PHASE       │
└──────┬──────┘
       │
       ├─── Same zone? ──→ PLAY PHASE (next level)
       │
       └─── New zone? ───→ interstitial-screen ──→ PLAY PHASE (next level)
```

## Phase Details

### 1. Boot Phase

**Screen IDs:** `loading` → `start`
**Wrappers:** `loading-screen`, `title-screen`

| Step | What happens | Wrapper |
|------|-------------|---------|
| App mounts | Loading screen appears, resolves asset bundles from manifest by prefix (`boot-`, `theme-`, `core-`, `audio-`) | `loading-screen` |
| Assets loaded | Auto-transition to title screen | `loading-screen` |
| Title screen | Logo entrance, title slide-up, Play button entrance | `title-screen` |
| Play tapped | Audio unlock (mobile gate), GPU init, load remaining assets | `title-screen` |
| Settings tapped | Settings overlay opens (audio/music toggles) | `settings-screen` |

**Audio unlock is mandatory.** Mobile browsers silently block all audio until a user gesture calls `unlockAudio()`. The Play button is the gate.

### 2. Play Phase

**Screen ID:** `game`
**Wrappers:** `hud`, `talking-heads` (optional)

This is where the AI-generated game lives. Everything here is archetype-specific — the wrappers only provide the surrounding HUD and optional dialogue overlay.

| Layer | What | Wrapper |
|-------|------|---------|
| GPU canvas | Game board, sprites, particles, animations | *none — AI generates this* |
| GPU overlay | Level, goal progress, moves remaining, stars | `hud` |
| DOM overlay | Character dialogue during gameplay (tap to advance) | `talking-heads` |

**State flow:** ECS is source of truth → `bridgeEcsToSignals()` propagates to SolidJS signals → HUD reads signals. Wrappers never write to ECS.

**Talking heads** can appear at any point during gameplay — level intros, mid-level story beats, tutorial guidance. They sit at z-50 above the game canvas. Gameplay can pause or continue underneath.

**End conditions:**
- Goal complete → win outcome
- Moves exhausted (or lives lost, timer expired, etc.) → loss outcome

### 3. Win Outcome

**Screen ID:** `results`
**Wrapper:** `win-screen` (branch within results)

| Step | Timing | What happens |
|------|--------|-------------|
| Overlay fade | 0ms | Dark overlay fades in (400ms) |
| Title | 150ms | "Level Complete!" scales in |
| Stars | 400ms | Stars reveal with stagger (200ms each) |
| Score | 500ms | Score and level fade in |
| Buttons | 1000ms | "Next Level" and "Main Menu" entrance |

**Player choices:**
- **Next Level** → progression phase (zone check)
- **Main Menu** → back to title screen

### 4. Loss Outcome

**Screen ID:** `results`
**Wrapper:** `loss-screen` (branch within results)

| Step | Timing | What happens |
|------|--------|-------------|
| Overlay fade | 0ms | Dark overlay fades in (400ms) |
| Title | 150ms | "Out of Moves" slides down |
| Encouragement | 350ms | Random encouraging subtitle fades in |
| Score | 500ms | Score section fades in |
| Buttons | 800ms | "Retry" (primary, large) and "Main Menu" |

**Player choices:**
- **Retry** → replay same level (reset score/moves, keep level number)
- **Main Menu** → back to title screen

### 5. Progression Phase

**Wrapper:** `interstitial-screen` (conditional)

After a win, before the next level loads:

```typescript
const ZONE_SIZE = 20; // ADAPT: levels per zone
const oldZone = Math.floor(currentLevel / ZONE_SIZE);
const newZone = Math.floor(nextLevel / ZONE_SIZE);

if (newZone !== oldZone) {
  // Show interstitial with zone narrative
  showInterstitial(newZone);
} else {
  // Skip straight to next level
  goto('game');
}
```

The interstitial shows zone narrative (title, body text, optional background art). Typewriter text effect, tap to skip, Continue button appears after text finishes. Supports multi-slide sequences with page dots.

**State changes at this point:**
- `level++`
- `zone++` (if boundary crossed)
- Reset score, moves, stars for new level

## Screen ID Mapping

The core scaffold supports exactly 4 screen IDs. Everything else is an overlay or a branch within a screen.

| Screen ID | What renders | Wrappers involved |
|-----------|-------------|-------------------|
| `loading` | Asset preload + progress bar | `loading-screen` |
| `start` | Title, logo, Play button | `title-screen`, `settings-screen` (overlay) |
| `game` | AI-generated gameplay | `hud` (GPU), `talking-heads` (DOM overlay) |
| `results` | Win or loss branch based on `gameState` | `win-screen`, `loss-screen`, `interstitial-screen` (overlay) |

## Wrapper Picking (A La Carte)

Not every game needs every wrapper. Here's the minimum vs full set:

| Wrapper | Required? | When to include |
|---------|-----------|----------------|
| `loading-screen` | Yes | Always — every game loads assets |
| `title-screen` | Yes | Always — entry point and audio unlock gate |
| `hud` | Yes | Always — players need score/moves/goal feedback |
| `win-screen` | Yes | Always — games have win conditions |
| `loss-screen` | Yes | Always — games have fail conditions |
| `settings-screen` | Recommended | Include unless game has no audio |
| `interstitial-screen` | Optional | Include if game has zones/chapters/narrative progression |
| `leaderboard-screen` | Optional | Include if game has competitive/social features |
| `talking-heads` | Optional | Include if game has character dialogue or story beats |

## State Contract Summary

| Signal | Written by | Read by | Survives game destroy? |
|--------|-----------|---------|----------------------|
| `score` | ECS → bridge | Win, Loss, Leaderboard, HUD | Yes (signal) |
| `highScore` | ECS (derived) | Win, Leaderboard | Yes (signal) |
| `level` | ECS / Results screen | Title, Game, Win, Loss, Interstitial, HUD | Yes (signal) |
| `zone` | Derived from level | Interstitial | Yes (derived) |
| `starsEarned` | ECS → bridge | Win, HUD | Yes (signal) |
| `movesRemaining` | ECS → bridge | Loss, HUD | Yes (signal) |
| `blockerCount` | ECS → bridge | Results (win/loss branch) | Yes (signal) |
| `goalLabel` | Level config | Win, Loss, HUD | Yes (signal) |
| `goalProgress` | ECS → bridge | Win, Loss, HUD | Yes (signal) |
| `goalTarget` | Level config | Win, Loss, HUD | Yes (signal) |

**Key rule:** The ECS database is destroyed when leaving the `game` screen. The `results` screen reads from SolidJS signals, which persist across screen transitions. This is why the bridge exists — it copies ECS state into signals before the database goes away.

## The AI's Job vs The Wrappers' Job

```
┌──────────────────────────────────────────────────┐
│                WRAPPERS HANDLE                    │
│  Loading, title, settings, HUD, win, loss,       │
│  interstitial, leaderboard, talking heads         │
│  ─────────────────────────────────────────────    │
│  Locked. Tested. Never regenerated.               │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                AI GENERATES                       │
│  The game screen content:                         │
│  Board rendering, piece logic, animations,        │
│  interaction handling, scoring, power-ups,         │
│  particles, level generation, difficulty curve     │
│  ─────────────────────────────────────────────    │
│  Built in passes. This is where all effort goes.  │
└──────────────────────────────────────────────────┘
```

The wrappers are the frame. The AI paints the picture inside it.
