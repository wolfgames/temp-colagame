# Tap-Swap Interaction Archetype

## When to Use
Match-3 and grid-swap puzzle games where the player touches a piece and flicks in a cardinal direction to swap it with its neighbor.

## What This Archetype Provides
- **Gesture detection** — pointer event handling with flick threshold and direction snapping
- **Swap animation** — ghost overlay pattern (two temporary elements slide to each other's positions)
- **Reject animation** — shake with rotation for invalid swaps
- **Gravity drop animation** — CSS keyframes with bounce, separate treatment for existing vs spawned pieces
- **Cascade escalation** — timing and intensity scale with chain depth
- **Launch/flight arc** — parabolic arc with ground shadow (for merge-launch games)

## Files
| File | Purpose | Copy directly? |
|------|---------|---------------|
| `swap-animation.css` | All CSS keyframes and classes | Yes — copy into your game's CSS |
| `interaction-patterns.tsx` | React/JS patterns for gesture, swap, gravity, launch | No — adapt to your game's types and store |

## Integration Steps
1. **Copy `swap-animation.css` directly** into your component CSS (or import it). Do not modify keyframes.
2. **Copy functions and patterns from `interaction-patterns.tsx`** into your game code. Change ONLY lines marked `// ADAPT:`.
3. Everything else is LOCKED — do not change values, formulas, timing, or structure.

## Locked vs Adaptable

**LOCKED — do not change:**
- All CSS keyframes and class names in `swap-animation.css`
- `FLICK_THRESHOLD` (15px)
- `detectFlickDirection()` logic
- Ghost overlay pattern (swap-slide, `--swap-dx`/`--swap-dy`, 180ms)
- `isGemSwapping()` logic
- `computeDrops()` — all formulas, timing values, bounce calculations, gem.id keying
- `cascadeParams()` — all scaling formulas
- `computeLaunchPosition()` — all arc/shadow/scale math
- `getDropStyle()` — CSS property names and values

**ADAPTABLE — change only where `// ADAPT:` appears:**
- Type names (use your game's Gem, Board, Color types)
- Store API calls (your swap/validate/setState functions)
- Board dimensions (`BOARD_SIZE`, `CELL_SIZE`, `GAP`)
- Gem gradient key names (to match your color type, but keep the gradient values)

**If you discover an improvement**, do NOT apply it in the game. The archetype is the source of truth. Note the improvement for archetype evolution.

## Gem Visual Style (LOCKED)

Game pieces are **colored rounded rectangles** with radial gradient shading. Do NOT use circles, hexagons, diamonds, stars, emoji, SVG shapes, or text characters as the gem shape. Every gem is the same rounded-rectangle shape — color alone distinguishes them.

**Gems fill 100% of their cell.** Spacing comes from `GAP` between cells, not from shrinking the gem. Do NOT use `width/height < 100%` or `clipPath` on gem elements.

```css
/* Gem base — same shape for all colors */
border-radius: 10px;
box-shadow: inset 0 -3px 6px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3);
```

```typescript
/* 5 colors with radial gradients (highlight at top-left for 3D feel) */
const GEM_GRADIENTS: Record<GemColor, string> = {
  red:    "radial-gradient(circle at 35% 35%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)",
  blue:   "radial-gradient(circle at 35% 35%, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)",
  green:  "radial-gradient(circle at 35% 35%, #86efac 0%, #22c55e 50%, #15803d 100%)",
  yellow: "radial-gradient(circle at 35% 35%, #fde68a 0%, #eab308 50%, #a16207 100%)",
  purple: "radial-gradient(circle at 35% 35%, #d8b4fe 0%, #a855f7 50%, #7e22ce 100%)",
};
```

The ghost overlay elements during swap must match this same visual style so the animation is seamless.

## Key Constraints
- **No `transition: transform` on gem/cell elements** — it conflicts with grid repositioning and causes mirror effects
- **Ghost overlays for swap** — don't animate the real grid cells, animate temporary overlay elements
- **Animate first, commit state after** — the swap animation plays on the CURRENT board, then state commits when animation ends
- **Input blocked during all animation phases** — check phase AND animation state before accepting gestures
- **React key={gem.id}** — every gem has a stable unique numeric ID; use it as the React key, never row/col
- **Drop animations keyed by gem.id** — `computeDrops()` returns `Map<number, DropInfo>`, look up with `dropAnims.get(gem.id)`
