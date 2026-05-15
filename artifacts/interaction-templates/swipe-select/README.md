# Swipe-Select Interaction Archetype

## When to Use
Path-drawing and word-building games where the player drags a continuous path through adjacent grid cells. Examples: Wordament-style word search, connect-the-dots puzzles, path-based spelling games, any game where swiping across cells builds a selection chain.

## What This Archetype Provides
- **Path building** — pointer event handling with 8-directional adjacency and backtrack support
- **Cell selection highlight** — scale-up with accent border on selected cells
- **Valid word pulse** — green flash (300ms) for accepted paths
- **Invalid shake** — red shake (160ms) for rejected paths
- **SVG path line** — connects selected cells with a translucent stroke
- **Score float** — animated score popup on valid submission
- **Board generation** — weighted letter frequency pool with seeded RNG
- **Word discovery** — DFS to find all valid words on the board

## Files
| File | Purpose | Copy directly? |
|------|---------|---------------|
| `select-animation.css` | All CSS keyframes and classes | Yes — copy into your game's CSS |
| `interaction-patterns.tsx` | React/JS patterns for path, validation, scoring, board gen | No — adapt to your game's types and store |

## Integration Steps
1. **Copy `select-animation.css` directly** into your component CSS (or import it). Do not modify keyframes.
2. **Copy functions and patterns from `interaction-patterns.tsx`** into your game code. Change ONLY lines marked `// ADAPT:`.
3. Wire `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` onto your board container element.
4. Set `touch-action: none` on the board container to prevent browser scroll during path drawing.
5. Use `setPointerCapture` on pointerdown so the path tracks even if the finger leaves the board element.
6. Everything else is LOCKED — do not change values, formulas, timing, or structure.

## Locked vs Adaptable

**LOCKED — do not change:**
- All CSS keyframes and class names in `select-animation.css`
- 8-directional adjacency (not 4-directional) in `isAdjacent()`
- Path must be continuous through adjacent cells
- Each cell used only once per path
- Backtrack by returning to previous cell (removes last cell from path)
- Scoring formula: `Math.round(10 * Math.pow(wordLength, 1.8))`
- Cell selection scale: 1.1x
- Valid pulse: 300ms green
- Invalid shake: 160ms
- Letter frequency weights for board generation
- `findAllWords()` DFS logic and depth cap (8 letters)
- Coordinate conversion math in `getCellFromPointer()`

**ADAPTABLE — change only where `// ADAPT:` appears:**
- Dictionary source (inline set, fetch from API, import from file)
- Validation function (dictionary lookup, custom rules)
- Board dimensions (default 5x5, can be changed)
- Type names (use your game's Cell, Coord types)
- Store API calls (your state management functions)

**If you discover an improvement**, do NOT apply it in the game. The archetype is the source of truth. Note the improvement for archetype evolution.

## Cell Visual Style (LOCKED)

Grid cells are **rounded rectangles** with a flat background. Do NOT use circles, hexagons, or irregular shapes for cells. Letters are centered, bold, uppercase. Spacing comes from `GAP` between cells, not from shrinking the cell.

```css
/* Cell base — same shape for all cells */
border-radius: 10px;
border: 2px solid transparent;
transition: transform 0.1s ease, border-color 0.1s ease, background 0.1s ease;
```

## Animation Timing Reference

| Animation | Duration | Easing | Notes |
|-----------|----------|--------|-------|
| Cell selection scale | 100ms | ease | `transform: scale(1.1)` via transition |
| Valid pulse | 300ms | ease-out | Green glow, scale 1.1 to 1.15 to 1.0 |
| Invalid shake | 160ms | ease-out | Horizontal translateX oscillation |
| Score float | 800ms | ease-out | Fade up and out |
| Pop-in | 200ms | ease-out | Scale 0.8 to 1.0 with opacity |

## Key Constraints
- **No `transition: transform` on cells during animation** — the selection scale uses transition, but valid/invalid keyframes override it
- **Pointer capture on start** — call `setPointerCapture` so the drag continues outside the board
- **Block input during animation** — check animation state before accepting new path starts
- **SVG overlay for path line** — render an SVG with `pointerEvents: none` over the board, not CSS borders between cells
- **Backtrack detection** — when pointermove hits the second-to-last cell in the path, pop the last cell off
