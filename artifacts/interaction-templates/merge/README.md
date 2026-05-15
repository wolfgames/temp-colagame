# Merge Interaction Archetype

## When to Use
Merge games where the player drags a piece onto an adjacent same-tier piece to combine them into a higher tier. Covers 2048-style, Merge Dragons, Triple Town, and any game where combining identical items produces upgraded items.

## What This Archetype Provides
- **Drag gesture** -- pointer event handling with ghost piece following the pointer
- **Merge animation** -- pop/pulse at target cell when tiers combine (280ms)
- **Spawn animation** -- new piece appears with overshoot bounce (250ms back.out)
- **Snap-back animation** -- piece returns to origin on invalid drop (200ms elastic)
- **Ghost piece** -- translucent copy follows pointer during drag
- **Drop target highlight** -- valid merge targets glow while dragging
- **Win/lose detection** -- max tier reached or board full with no merges

## Files
| File | Purpose | Copy directly? |
|------|---------|---------------|
| `merge-animation.css` | All CSS keyframes and classes | Yes -- copy into your game's CSS |
| `interaction-patterns.tsx` | React/JS patterns for drag, merge, spawn, scoring | No -- adapt to your game's types and store |

## Integration Steps
1. **Copy `merge-animation.css` directly** into your component CSS (or import it). Do not modify keyframes.
2. **Copy functions and patterns from `interaction-patterns.tsx`** into your game code. Change ONLY lines marked `// ADAPT:`.
3. Everything else is LOCKED -- do not change values, formulas, timing, or structure.

## Locked vs Adaptable

**LOCKED -- do not change:**
- All CSS keyframes and class names in `merge-animation.css`
- Merge rule: same tier + adjacent (4-directional) = tier + 1
- Scoring formula: `Math.round(10 * Math.pow(resultTier, 2))`
- `canMerge()` logic (same tier, adjacent, below max)
- `applyMerge()` logic (create tier+1 at target, clear source)
- `isAdjacent()` -- orthogonal only (dr + dc === 1), not diagonal
- Ghost piece rendering pattern (fixed position, translate -50%/-50%, scale 1.1)
- Drop target highlight style
- Merge pop animation: 280ms cubic-bezier(0.34, 1.56, 0.64, 1)
- Spawn animation: 250ms cubic-bezier(0.34, 1.56, 0.64, 1)
- Snap-back animation: 200ms cubic-bezier(0.34, 1.56, 0.64, 1)
- Tier color palette (8-tier radial gradients)

**ADAPTABLE -- change only where `// ADAPT:` appears:**
- Type names (use your game's Piece, Board, Tier types)
- Store API calls (your merge/validate/setState functions)
- Board dimensions (ROWS, COLS -- default 5x5)
- CELL_SIZE (default 70px) and GAP (default 6px)
- MAX_TIER (default 8)
- Tier names/themes (display labels for each tier level)
- Starting board configuration (how many initial pieces, which tiers)

**If you discover an improvement**, do NOT apply it in the game. The archetype is the source of truth. Note the improvement for archetype evolution.

## Piece Visual Style (LOCKED)

Game pieces are **colored rounded rectangles** with radial gradient shading and a tier number centered inside. Do NOT use circles, hexagons, diamonds, stars, emoji, or SVG shapes as the piece shape. Every piece is the same rounded-rectangle shape -- the radial gradient color and tier number distinguish them.

**Pieces fill 100% of their cell.** Spacing comes from `GAP` between cells, not from shrinking the piece. Do NOT use `width/height < 100%` or `clipPath` on piece elements.

```css
/* Piece base -- same shape for all tiers */
border-radius: 10px;
font-size: 26px;
font-weight: 800;
color: #fff;
text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
```

```typescript
/* 8 tiers with radial gradients (highlight at top-left for 3D feel) */
const TIER_COLORS: Record<Tier, { base: string; light: string }> = {
  1: { base: '#dc2626', light: '#f87171' },   // red
  2: { base: '#2563eb', light: '#60a5fa' },   // blue
  3: { base: '#16a34a', light: '#4ade80' },   // green
  4: { base: '#eab308', light: '#facc15' },   // yellow
  5: { base: '#9333ea', light: '#c084fc' },   // purple
  6: { base: '#f97316', light: '#fdba74' },   // orange
  7: { base: '#ec4899', light: '#f9a8d4' },   // pink
  8: { base: '#06b6d4', light: '#67e8f9' },   // cyan
};
// Gradient: radial-gradient(circle at 35% 35%, light, base)
```

The ghost piece during drag must match this same visual style so the animation is seamless.

## Animation Timing Reference

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Merge pop | 280ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Piece created at target after merge |
| Spawn in | 250ms | cubic-bezier(0.34, 1.56, 0.64, 1) | New random piece appears on board |
| Snap back | 200ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Invalid drop, piece returns to origin |
| Merge pulse | 200ms | ease-out | Score feedback on merged piece |

## Key Constraints
- **No `transition: transform` on piece elements** -- it conflicts with animation classes
- **Ghost piece for drag** -- don't move the real grid piece, render a fixed-position ghost at pointer
- **Animate first, commit state after** -- merge animation plays, then board state updates
- **Input blocked during animation** -- check locked state before accepting gestures
- **React key={piece.id}** -- every piece has a stable unique string ID; use it as the React key, never row/col
- **4-directional adjacency only** -- merges require orthogonal neighbors, no diagonals
