# Drag-Drop Interaction Archetype

## When to Use
Card games, block/tile placement, inventory management, or any game where the player picks up a piece from one location and drops it onto another. Source-to-target drag: solitaire tableau moves, deck-builder card plays, puzzle piece placement, resource allocation.

## What This Archetype Provides
- **Drag lifecycle** -- pointerdown captures piece + click offset, pointermove updates ghost position, pointerup resolves drop via hit detection
- **Ghost rendering** -- dragged piece(s) follow the pointer at fixed position with elevated z-index and shadow
- **Drop zone detection** -- highlight nearest valid target during drag with green glow
- **Snap-back animation** -- invalid drops return piece to origin (200ms elastic)
- **Drop settle animation** -- valid drops ease into place (200ms ease-out)
- **Double-tap shortcut** -- auto-move piece to best valid target
- **Flip animation** -- card face-up/face-down reveal
- **Score float and win celebration** -- feedback animations

## Files
| File | Purpose | Copy directly? |
|------|---------|---------------|
| `drag-animation.css` | All CSS keyframes and classes | Yes -- copy into your game's CSS |
| `interaction-patterns.tsx` | React/JS patterns for drag lifecycle, ghost, hit detection, drop logic | No -- adapt to your game's types and store |

## Integration Steps
1. **Copy `drag-animation.css` directly** into your component CSS (or import it). Do not modify keyframes.
2. **Copy functions and patterns from `interaction-patterns.tsx`** into your game code. Change ONLY lines marked `// ADAPT:`.
3. Wire `onPointerDown`, `onPointerMove`, and `onPointerUp` to your board/container element.
4. Use `setPointerCapture` on pointerdown for reliable drag tracking (already in the pattern).
5. Render the ghost overlay inside a fixed-position container with `pointerEvents: "none"`.
6. Everything else is LOCKED -- do not change values, formulas, timing, or structure.

## Locked vs Adaptable

**LOCKED -- do not change:**
- Drag starts on `pointerdown` (immediate, no threshold)
- Ghost follows pointer with original click offset preserved
- Drop targets highlight during drag (green glow)
- Valid drop: 200ms ease-out settle animation
- Invalid drop: 200ms snap-back animation
- Double-tap auto-move to best valid target
- Z-index elevation during drag (`z-index: 100` for ghost container, `z-index: 1000` for overlay)
- Pointer capture via `setPointerCapture` for reliable drag tracking
- `pointInRect()` hit test logic
- `findDropTarget()` scan logic
- Ghost opacity/shadow styling (scale 1.04, shadow `0 8px 24px rgba(0,0,0,0.4)`)
- Source piece dims to `opacity: 0.3` during drag
- All CSS keyframes and class names in `drag-animation.css`
- Animation timing constants (SETTLE_MS=200, SNAPBACK_MS=200, FLIP_MS=300, SCORE_FLOAT_MS=800, CELEBRATION_MS=600)

**ADAPTABLE -- change only where `// ADAPT:` appears:**
- Piece/card types (use your game's Card, Piece, Token types)
- Drop validation rules (your game's `canDrop` logic)
- Layout dimensions (`CARD_WIDTH`, `CARD_HEIGHT`, `STACK_OFFSET`)
- Pile structure (tableau columns, foundations, hand, board zones)
- Store/state API calls (your move/validate/setState functions)
- Visual style of pieces (colors, gradients, face content)
- Board layout and zone positions

**If you discover an improvement**, do NOT apply it in the game. The archetype is the source of truth. Note the improvement for archetype evolution.

## Animation Timing Reference

| Animation | Duration | Easing | Class/Keyframe |
|-----------|----------|--------|----------------|
| Drop settle | 200ms | ease-out | `drop-settle` |
| Snap-back | 200ms | cubic-bezier(0.68,-0.55,0.27,1.55) | `snap-back` |
| Drop zone glow | continuous | -- | `.drop-glow` |
| Card flip | 300ms | ease-in-out (two-phase) | `card-flip-out` / `card-flip-in` |
| Score float | 800ms | ease-out | `score-float` |
| Win celebration | 600ms | ease-out | `celebration-pop` |
| Fade in | 300ms | ease-out | `fadeIn` |

## Key Constraints
- **No `transition: transform` on draggable elements** -- it conflicts with position updates during drag
- **Ghost overlay for drag** -- do not move the real element, render a temporary ghost at pointer position
- **Pointer capture is mandatory** -- without it, fast drags lose tracking when pointer leaves the element
- **`touch-action: none`** on the board container -- prevents browser scroll/zoom during drag
- **`user-select: none`** on the board container -- prevents text selection during drag
- **Input blocked during animations** -- check animation state before accepting new drags
