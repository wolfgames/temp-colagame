# Wrapper Template: Win Screen

Celebratory end screen for the win state of a round. Shows score summary, star rating, and celebration animation. The loss variant uses the same layout with different messaging and a retry button.

## When to Use

- After a level/round ends (win or loss)
- Can be implemented as a full DOM screen OR as a Pixi overlay on top of the game board
- Both patterns are provided — choose based on whether you want the board visible behind

## Screen Flow

```
game → [win condition met] → win-screen → [Next Level] → game (next level)
                                        → [Main Menu]  → title-screen

game → [loss condition met] → win-screen (loss variant) → [Retry] → game (same level)
                                                         → [Main Menu] → title-screen
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `screens/` directory
2. Adapt only lines marked `// ADAPT:` — star thresholds, button labels, colors
3. Copy `screen-animation.css` for celebration animations
4. Wire `onNextLevel`, `onRetry`, `onMenu` to your navigation
5. Pass score, stars, and level data from game state

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Overlay fade: 400ms, power2.out                             │
│   - Title entrance: 400ms scale + fade, back.out(1.5)           │
│   - Star reveal: 300ms each, 200ms stagger, back.out(2)         │
│   - Score count-up: 800ms, power2.out (animated number)         │
│   - Button entrance: 300ms, back.out(1.3), 500ms delay          │
│   - Confetti burst: 40–60 particles, 1200ms lifetime            │
│   - Star layout: 3 stars, horizontal, centered                  │
│   - Loss variant: same layout, red accent, "Out of Moves" title │
│   - Minimum button tap target: 48×48px                          │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Win/loss title text                                          │
│   - Button labels ("Next Level", "Retry", "Main Menu")          │
│   - Star count (default 3)                                       │
│   - Score display format                                         │
│   - Color palette (win green, loss red, star gold)               │
│   - Whether to use DOM screen or Pixi overlay pattern            │
│   - Additional stats to display (moves used, combos, etc.)       │
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
│      Level Complete!         │  title (25% from top)
│                              │
│        ★ ★ ★                 │  stars (35% from top)
│                              │
│      Score: 4,250            │  score (45% from top)
│     High Score: 5,100        │  optional high score
│                              │
│   ┌───────────┐ ┌─────────┐ │  buttons (60% from top)
│   │Next Level │ │Main Menu│ │
│   └───────────┘ └─────────┘ │
│                              │
└──────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Delay |
|-----------|----------|------|-------|
| Overlay fade | 400ms | power2.out | 0ms |
| Title entrance | 400ms | back.out(1.5) | 150ms |
| Star 1 reveal | 300ms | back.out(2) | 400ms |
| Star 2 reveal | 300ms | back.out(2) | 600ms |
| Star 3 reveal | 300ms | back.out(2) | 800ms |
| Score count-up | 800ms | power2.out | 500ms |
| Button entrance | 300ms | back.out(1.3) | 1000ms |
| Button stagger | 50ms | — | — |
| Confetti burst | 1200ms | — | 300ms (on win only) |
