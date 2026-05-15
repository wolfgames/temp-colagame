# Wrapper Template: Loss Screen

Shown when the player fails a level — out of moves, no valid moves, or other loss conditions. Offers retry (costs a life), use a booster, or return to menu. Tone is encouraging, not punishing.

## When to Use

- Player runs out of moves
- No valid moves remain on the board
- Any game-specific loss condition

## Screen Flow

```
game → [loss condition] → loss-screen → [Retry]     → game (same level, -1 life)
                                       → [Main Menu] → title-screen
                                       → [Use Boost] → game (same level, boosted)
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — messaging, colors, whether boosters exist
3. Copy `screen-animation.css` for entrance animations
4. Wire `onRetry` through state manager (decrements lives, resets level state)
5. Wire `onMenu` to state manager `goto('start')`

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Overlay fade: 400ms, power2.out                             │
│   - Title entrance: 400ms, power2.out, slide down               │
│   - Subtitle entrance: 300ms, power2.out, 200ms delay           │
│   - Score summary: 300ms fade, 400ms delay                      │
│   - Button entrance: 300ms, back.out(1.3), 600ms delay          │
│   - Button stagger: 80ms between buttons                        │
│   - Retry is ALWAYS the primary action (largest, most prominent)│
│   - Lives counter visible when lives system is active            │
│   - No confetti, no celebration — tone is supportive             │
│   - Minimum button tap target: 48×48px                          │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Loss title text ("Out of Moves", "No Moves Left", etc.)     │
│   - Encouragement subtitle ("So close!", "Try again!", etc.)     │
│   - Button labels                                                │
│   - Whether booster option exists                                │
│   - Color palette (red accent, not green)                        │
│   - What score/stats to show (score, progress, moves used)       │
│   - Lives display format                                         │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

```
┌──────────────────────────────┐
│      ███████████████         │  dark overlay (70% black)
│                              │
│        Out of Moves          │  title (red accent)
│         So close!            │  encouraging subtitle
│                              │
│       Score: 2,150           │  what they achieved
│       Goal: 3,000            │  what they needed
│       ████████░░ 72%         │  visual progress (optional)
│                              │
│       ┌──────────────┐       │  primary: retry
│       │    Retry     │       │
│       └──────────────┘       │
│       ┌──────────────┐       │  secondary: booster (optional)
│       │  Use Booster │       │
│       └──────────────┘       │
│       ┌──────────────┐       │  tertiary: quit
│       │  Main Menu   │       │
│       └──────────────┘       │
│                              │
│       ♥ ♥ ♥ ♡ ♡             │  lives remaining
└──────────────────────────────┘
```

## Design Principles

1. **Encouraging, not punishing** — "So close!" not "You failed". Show how far they got.
2. **Retry is king** — biggest button, most prominent color, first in order.
3. **Show progress** — if the player was 72% to the goal, show that. It motivates retry.
4. **Lives are scarce** — display remaining lives clearly so the player values them.
5. **No celebration effects** — no confetti, no screen shake, no fanfare. Calm and supportive.

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Overlay fade | 400ms | power2.out | 0ms |
| Title entrance | 400ms | power2.out | 150ms |
| Subtitle entrance | 300ms | power2.out | 350ms |
| Score summary | 300ms | power2.out | 500ms |
| Progress bar fill | 600ms | power2.out | 600ms |
| Retry button | 300ms | back.out(1.3) | 800ms |
| Booster button | 300ms | back.out(1.3) | 880ms |
| Menu button | 300ms | back.out(1.3) | 960ms |
| Lives display | 200ms | power2.out | 1100ms |
