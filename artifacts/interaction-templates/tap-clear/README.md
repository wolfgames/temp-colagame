# Interaction Template: Tap-Clear

Tap a group of 2+ same-colored connected blocks to clear them. Gravity drops remaining blocks, new blocks spawn from above. Power-ups spawn from large groups.

## When to Use

- ClearPop / Toy Blast / Toon Blast style games
- Any game where the primary interaction is tapping connected groups to remove them
- Games where the player does NOT swap/slide pieces — they select and clear in place

## Interaction Flow

```
tap → find group (BFS) → validate (≥2) → clear → gravity → refill → highlight → idle
```

Total animation time per tap: ~760ms before player can act again.

## Integration Steps

1. Copy `clear-animation.css` into your project's CSS (or use the GSAP timing values if using a canvas renderer)
2. Adapt patterns from `interaction-patterns.tsx` to your game's types and renderer
3. Wire `pointertap` / `pointerdown` to your board's coordinate conversion
4. Every section marked `// ADAPT:` is safe to change. Everything else is LOCKED.

## Locked vs Adaptable

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCKED — do not change values, logic, or structure:             │
│   - MIN_GROUP_SIZE (2)                                          │
│   - findGroup() BFS — 4-directional, visited set, queue-based  │
│   - applyGravity() — column-major, bottom-up, obstacle-aware   │
│   - Scoring formula: 10 × groupSize^1.5                        │
│   - Pop timing: 200ms fast, 255ms punch, 420ms burst            │
│   - Gravity/refill timing: 280ms, back.out(1.4) ease           │
│   - Power-up thresholds: 5→rocket, 7→bomb, 9→color_burst       │
│   - Highlight pulse: 1.05× scale, 0.8s cycle, sine.inOut       │
│   - Reject shake: 4px, 160ms (4×40ms)                          │
│   - Combo anticipation: 900ms                                   │
│   - Rocket/bomb stagger: 42ms, burst stagger: 52ms             │
│                                                                 │
│ ADAPTABLE — change only where marked // ADAPT:                  │
│   - Type names (use your game's Block, Board, Color types)      │
│   - Renderer calls (PixiJS, React DOM, Canvas — your choice)    │
│   - Board dimensions (rows, cols, tileSize, gap)                │
│   - Color palette and gradient key names                        │
│   - Block visual style (keep rounded rectangles as default)     │
│   - Obstacle types and their behaviors                          │
│                                                                 │
│ If you find an improvement, do NOT apply it in the game.        │
│ Note it for archetype evolution instead.                        │
└─────────────────────────────────────────────────────────────────┘
```

## Block Visual Style (LOCKED)

Game pieces are **colored rounded rectangles** with radial gradient shading. Do NOT use circles, hexagons, diamonds, stars, emoji, SVG shapes, or text characters as the block shape. Every block is the same rounded-rectangle shape — color alone distinguishes them.

**Blocks fill 100% of their cell.** Spacing comes from `gap` between cells, not from shrinking the block. Do NOT use `width/height < 100%` or `clipPath` on block elements.

## Key Differences from Tap-Swap

| | Tap-Swap | Tap-Clear |
|---|---|---|
| Interaction | Tap + swipe direction | Single tap |
| Detection | Adjacent pair swap | BFS flood-fill of connected group |
| Minimum | 3-in-a-row | 2 connected same-color |
| Cascades | Automatic chain reactions | No cascades (single clear per tap) |
| Power-ups | Not in base template | Built-in (rocket, bomb, color burst) |
| Ghost overlay | Yes (swap animation) | No (clear in place) |

## Animation Timing Reference

| Animation | Duration | Ease |
|-----------|----------|------|
| Fast pop (regular clear) | 200ms | scale: back.in(2), alpha: power2.in |
| Punch pop (rocket line) | 255ms | 55ms wind-up + 200ms pop |
| Burst pop (color burst) | 420ms | 140ms swell + 100ms hold + 180ms implode |
| Gravity drop | 280ms | back.out(1.4) |
| Refill drop | 280ms | back.out(1.4) |
| Power-up spawn | 250ms | scale: back.out(2) |
| Highlight pulse | 800ms cycle | sine.inOut, repeating |
| Reject shake | 160ms | 4×40ms linear |
| Combo anticipation | 900ms | power2.in |
| Rocket stagger | 42ms/tile | from origin outward |
| Bomb ring stagger | 42ms/ring | Chebyshev distance |
| Burst stagger | 52ms/tile | reading order |
