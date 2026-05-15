# Wrapper Templates — Wiring Guide

How to assemble a complete game from interaction templates + wrapper templates. This is the single reference an agent needs to connect all the pieces.

## What Are Wrappers?

Wrappers are **prefab subsystems** — locked, tested, reusable UI components that every game needs but shouldn't be regenerated. When an AI builds a new game from an archetype, it picks wrappers a la carte and wires them in. Zero generation effort on loading screens, settings, win/loss, etc. The AI's time goes entirely into the game itself.

## State Management

State management is handled by **Adobe ECS** (your engineering team's chosen solution). Wrappers consume state via dependency injection — they do not own or manage game state. DOM reactivity bridges (e.g., SolidJS signals) receive updates from ECS observers.

## Full Screen Graph

```
┌─────────┐    ┌──────────┐    ┌──────────┐
│ Loading  │───→│  Title   │───→│   Game   │
│  Screen  │    │  Screen  │    │  Screen  │
└─────────┘    └──────────┘    └──────────┘
                    │  ↑             │
                    ▼  │             │
               ┌──────────┐         │
               │ Settings │         │
               │ (overlay) │         │
               └──────────┘         │
                                    │
                    ┌───────────────┤
                    ▼               ▼
              ┌──────────┐    ┌──────────┐
              │   Win    │    │   Loss   │
              │  Screen  │    │  Screen  │
              └──────────┘    └──────────┘
                    │               │
                    ▼               │
              ┌──────────┐         │
              │Interstitl│         │
              │ (overlay) │         │
              └──────────┘         │
                    │               │
          ┌────────┴───────┐       │
          ▼                ▼       ▼
    ┌──────────┐    ┌──────────┐  │
    │   Game   │    │  Title   │←─┘
    │(next lvl)│    │  Screen  │
    └──────────┘    └──────────┘

Any screen ──→ Leaderboard ──→ (back to caller)
```

## Core Screen IDs

The core scaffold supports these screen IDs: `loading`, `start`, `game`, `results`.

Win and loss are rendered within the `results` screen based on game state. Settings, interstitial, and leaderboard are overlays — they don't need their own screen IDs.

## Assembly Order

Build in this sequence. Each step produces a working game — later steps add polish.

### Step 1: Core Loop (minimum playable)

```
Loading → Title → Game → (win/loss logged to console)
```

Wrappers needed:
- `loading-screen/`
- `title-screen/`
- `hud/` (GPU overlay during gameplay)

### Step 2: Win/Loss Cycle

```
Game → Win Screen → Next Level → Game
Game → Loss Screen → Retry → Game
```

Wrappers added:
- `win-screen/`
- `loss-screen/`

### Step 3: Meta Layer

```
Win Screen → Interstitial (zone change) → Game
Title → Settings (overlay) → back
```

Wrappers added:
- `interstitial-screen/`
- `settings-screen/`
- `leaderboard-screen/` (a la carte — not every game needs this)

## Shared State Contract

ECS is the source of truth during gameplay. SolidJS signals bridge ECS state to DOM screens. Wrappers receive data via dependency injection (interfaces), not by importing state directly.

### Resources (ECS owns, wrappers read via deps)

| Resource | Type | Written by | Read by |
|----------|------|-----------|---------|
| `score` | number | Game Screen | Win, Loss, Leaderboard |
| `highScore` | number | ECS (derived) | Win, Leaderboard |
| `level` | number | ECS | Title, Game, Win, Loss, Interstitial |
| `zone` | number | ECS (derived) | Interstitial |
| `starsEarned` | number | Game Screen | Win |
| `movesRemaining` | number | Game Screen | Loss |
| `lives` | number | ECS | Title, Loss |
| `goalLabel` | string | Game Screen | Win, Loss |
| `goalProgress` | number | Game Screen | Win, Loss |
| `goalTarget` | number | Game Screen | Win, Loss |

### Transitions (who triggers what)

| From | To | Trigger | State changes |
|------|----|---------|---------------|
| Loading | Title | Assets loaded | — |
| Title | Game | Play tapped | Reset score, moves; set level |
| Title | Settings | Settings tapped | — |
| Game | Results (win) | Goal complete | Stars calculated, high score updated |
| Game | Results (loss) | Moves exhausted | — |
| Results (win) | Game | Next Level | `level++`, reset score/moves |
| Results (win) | Interstitial | Next Level + zone boundary | `level++`, `zone++` |
| Results (win) | Title | Main Menu | — |
| Results (loss) | Game | Retry | Reset score/moves (same level) |
| Results (loss) | Title | Main Menu | — |
| Interstitial | Game | Continue | Level already incremented |
| Settings | (dismiss) | Back | — |
| Leaderboard | (dismiss) | Back | — |

### Audio Unlock Gate

Mobile browsers require a user gesture before audio plays. The **first interactive tap** in the game (typically the Play button on the title screen) must call `unlockAudio()`. This is NOT optional — without it, all sound silently fails on mobile.

```
Title Screen → [Play tapped] → unlockAudio() → initGpu() → loadAssets() → goto('game')
```

### Zone Boundary Detection

Interstitials show at zone boundaries:

```typescript
const ZONE_SIZE = 20; // ADAPT: levels per zone
const newZone = Math.floor(nextLevel / ZONE_SIZE);
const oldZone = Math.floor(currentLevel / ZONE_SIZE);
if (newZone !== oldZone) showInterstitial();
else goto('game');
```

## Wrapper Index

| Folder | Purpose | Renderer | Pattern |
|--------|---------|----------|---------|
| [`loading-screen/`](loading-screen/) | Asset preload with progress bar | DOM | Screen |
| [`title-screen/`](title-screen/) | Logo, play button, settings entry | DOM | Screen |
| [`settings-screen/`](settings-screen/) | Audio/music toggle and volume | DOM | Overlay |
| [`win-screen/`](win-screen/) | Score summary, stars, next level | DOM | Results branch |
| [`loss-screen/`](loss-screen/) | Retry prompt, encouragement | DOM | Results branch |
| [`interstitial-screen/`](interstitial-screen/) | Zone narrative between rounds | DOM | Overlay |
| [`leaderboard-screen/`](leaderboard-screen/) | Ranked player list with tabs | DOM | Overlay |
| [`hud/`](hud/) | Level, goal, moves, stars | GPU (Pixi) | Pixi Container |
| [`talking-heads/`](talking-heads/) | Character dialogue over gameplay | DOM | Overlay |

## LOCKED vs ADAPTABLE (applies to all wrappers)

```
LOCKED:
  - Animation timing values (durations, easing, stagger)
  - Screen transition flow (the graph above)
  - Audio unlock on first interaction
  - Minimum 48x48px tap targets
  - Destruction order: tweens → listeners → DOM removal
  - HUD three-column layout and low-moves warning behavior

ADAPTABLE:
  - Visual content (text, colors, images, layout proportions)
  - Which optional wrappers to include (leaderboard, interstitial)
  - Data source for leaderboard (local, API)
  - Persistence backend (localStorage, cloud save)
  - Number of zones, zone size, star thresholds
  - Font family, label text, color palette
```
