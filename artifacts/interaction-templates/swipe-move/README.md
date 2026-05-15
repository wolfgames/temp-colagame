# Swipe-Move Interaction Archetype

## When to Use
Sliding-block puzzle games where the player swipes a piece to slide it along its orientation axis until it hits a wall, edge, or another piece. Classic examples: Rush Hour, Klotski, unblock-style puzzles.

## What This Archetype Provides
- **Gesture detection** — pointer event handling with flick threshold and direction snapping
- **Slide animation** — CSS transition on transform with dynamic `--slide-dx`/`--slide-dy` distance
- **Reject animation** — directional shake for invalid moves (wrong axis or blocked with zero distance)
- **Win celebration** — overlay with pop-in card animation
- **Piece spawn** — fade-in for level initialization
- **Orientation constraint** — pieces only slide along their width or height axis

## Files
| File | Purpose | Copy directly? |
|------|---------|---------------|
| `slide-animation.css` | All CSS keyframes and classes | Yes — copy into your game's CSS |
| `interaction-patterns.tsx` | React/JS patterns for gesture, slide, validation, win | No — adapt to your game's types and store |

## Integration Steps
1. **Copy `slide-animation.css` directly** into your component CSS (or import it). Do not modify keyframes.
2. **Copy functions and patterns from `interaction-patterns.tsx`** into your game code. Change ONLY lines marked `// ADAPT:`.
3. Everything else is LOCKED — do not change values, formulas, timing, or structure.

## Locked vs Adaptable

**LOCKED — do not change:**
- All CSS keyframes and class names in `slide-animation.css`
- `FLICK_THRESHOLD` (15px)
- `detectFlickDirection()` logic
- Slide animation (200ms ease-out via CSS transition on transform)
- Reject shake (160ms ease-out, 6px amplitude, directional)
- `canMoveDirection()` — orientation axis enforcement
- `slideDistance()` — occupancy grid scan, wall/edge/piece blocking
- `applyMove()` — dx/dy multiplication with distance
- `checkWin()` — hero off-board detection
- Coordinate conversion: `cellToPixel(i) = GAP + i * (CELL_SIZE + GAP)`
- Animation timing constants object

**ADAPTABLE — change only where `// ADAPT:` appears:**
- Type names (use your game's Piece, Board, Level types)
- Store API calls (your move/validate/setState functions)
- Board dimensions (`GRID`, `CELL_SIZE`, `GAP`)
- Piece color palette (keep the radial gradient structure, change color values)
- Exit position and win condition specifics
- Wall rendering style

**If you discover an improvement**, do NOT apply it in the game. The archetype is the source of truth. Note the improvement for archetype evolution.

## Piece Visual Style (LOCKED)

Game pieces are **colored rounded rectangles** with radial gradient shading. Do NOT use circles, hexagons, diamonds, stars, emoji, SVG shapes, or text characters as the piece shape. Every piece is the same rounded-rectangle shape — color alone distinguishes them.

**Pieces fill 100% of their cell(s).** A piece spanning 2 cells occupies the full width of both cells plus the gap between them. Spacing between pieces comes from `GAP` between cells, not from shrinking the piece. Do NOT use `width/height < 100%` or `clipPath` on piece elements.

```css
/* Piece base — same shape for all colors */
border-radius: 10px;
border: 2px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
```

```typescript
/* Radial gradient with highlight at top-left for 3D feel */
background: `radial-gradient(circle at 30% 30%, ${piece.highlight}, ${piece.color})`;
```

The hero piece gets enhanced styling (brighter border, colored glow shadow) and a "GO" label.

## Animation Timing Reference

| Animation | Duration | Easing | Notes |
|-----------|----------|--------|-------|
| Slide | 200ms | ease-out | CSS transition on transform |
| Reject shake (horizontal) | 160ms | ease-out | 6px amplitude, 4 keyframe stops |
| Reject shake (vertical) | 160ms | ease-out | 6px amplitude, 4 keyframe stops |
| Win overlay fade-in | 300ms | ease | Background overlay |
| Win card pop-in | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Overshoot spring |
| Exit indicator pulse | 1.5s | ease-in-out | Infinite loop, opacity 1 to 0.4 |

## Key Constraints
- **Orientation lock** — pieces with width > 1 slide only horizontal; height > 1 slide only vertical; 1x1 can move any direction
- **Slide until blocked** — piece slides maximum distance in chosen direction until hitting wall, edge, or another piece
- **No `transition: transform` on piece base class** — only add it via `.piece-sliding` when actively animating
- **Animate first, commit state after** — slide animation plays on current position via CSS transform, then state commits to new grid position when animation ends
- **Input blocked during animation** — check `animating` flag before accepting gestures
- **Pointer capture** — use `setPointerCapture` on pointer down for reliable gesture tracking
- **`touch-action: none`** on piece elements — prevents browser scroll interference
- **React key={piece.id}** — every piece has a stable unique string ID; use it as the React key, never row/col
