# Wrapper Template: HUD (Heads-Up Display)

GPU-rendered gameplay overlay showing level, goal progress, moves remaining, and star rating. Rendered in Pixi — no DOM inside the game canvas.

## When to Use

- Every game that has score, moves, or level tracking during gameplay
- Must be GPU-rendered (Pixi Text/Graphics) — DOM elements are forbidden inside the game canvas

## Layout

```
┌──────────────────────────────────┐
│ LEVEL        GOAL         MOVES  │
│  3      Score 450/2000      12   │
│                            ★★☆   │
├──────────────────────────────────┤
│                                  │
│           [game board]           │
│                                  │
└──────────────────────────────────┘
```

## Integration Steps

1. Copy `screen-patterns.tsx` into your game's `renderers/` directory
2. Instantiate `HudRenderer` in your GameController
3. Call `layout(viewportWidth)` after resize
4. Wire ECS observers to update methods: `updateLevel()`, `updateGoal()`, `updateMoves()`, `updateStars()`
5. Add `hud.container` to your Pixi stage above the board layer

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - Three-column layout: Level (left), Goal (center), Moves (r) │
│   - Low-moves warning: red + pulse at ≤5 moves                  │
│   - Star animation: scale pulse when count changes               │
│   - Moves pulse: back.out(2) ease, 200ms duration               │
│   - Star rating: 3 stars, gold filled / gray empty               │
│   - Minimum text sizes: labels 14px, values 32px                 │
│   - Destroy kills tweens before removing children                │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Font family                                                  │
│   - Label text ("LEVEL", "GOAL", "MOVES")                       │
│   - Colors (label, value, warning, star)                         │
│   - Star count (default 3)                                       │
│   - Low-moves threshold (default 5)                              │
│   - Goal format string                                           │
│   - Padding and vertical offset                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Animation Timing Reference

| Animation | Duration | Ease | Trigger |
|-----------|----------|------|---------|
| Moves warning pulse | 200ms | back.out(2) | Moves ≤ threshold |
| Star fill change | immediate | — | Star count changes |
