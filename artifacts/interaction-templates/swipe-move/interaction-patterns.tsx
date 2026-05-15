/**
 * Swipe-Move Interaction Archetype — React/JS Patterns
 *
 * This file contains the definitive patterns for swipe-move interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                 │
 * │ LOCKED — do not change values, logic, or structure:             │
 * │   - FLICK_THRESHOLD (15px)                                      │
 * │   - detectFlickDirection() — use as-is                          │
 * │   - canMoveDirection() — orientation axis enforcement           │
 * │   - slideDistance() — occupancy grid, wall/edge/piece blocking  │
 * │   - applyMove() — dx/dy multiplication with distance           │
 * │   - checkWin() — hero off-board detection                      │
 * │   - cellToPixel() — coordinate conversion formula              │
 * │   - ANIMATION_TIMING — all duration/easing values              │
 * │   - Piece visual style — radial gradient, border, box-shadow   │
 * │                                                                 │
 * │ ADAPTABLE — change only where marked // ADAPT:                  │
 * │   - Type names (use your game's Piece, Board, Level types)      │
 * │   - Store API calls (your move/validate/setState functions)     │
 * │   - Board dimensions (GRID, CELL_SIZE, GAP)                    │
 * │   - Piece color palette (keep gradient structure)               │
 * │   - Exit/win condition specifics                                │
 * │   - Wall definitions and rendering                              │
 * │                                                                 │
 * │ If you find an improvement, do NOT apply it in the game.        │
 * │ Note it for archetype evolution instead.                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent — copy what you need.
 */

import React, { useState, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const GRID = 6;            // ADAPT: match your grid size
const CELL_SIZE = 60;      // ADAPT: match your cell size
const GAP = 4;             // ADAPT: match your grid gap
const STRIDE = CELL_SIZE + GAP;
const BOARD_SIZE = GRID * CELL_SIZE + (GRID + 1) * GAP;
const FLICK_THRESHOLD = 15; // px — works well for both touch and mouse. LOCKED.

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1b: PIECE VISUAL STYLE (LOCKED)
 *
 * Pieces are colored rounded rectangles with radial gradients.
 * Do NOT use circles, hexagons, diamonds, stars, emoji, or SVG shapes.
 * Color alone distinguishes pieces — shape is always the same.
 * Pieces fill 100% of their cell(s) — spacing comes from GAP, not from
 * shrinking the piece. Do NOT use width/height < 100% or clipPath.
 *
 * Multi-cell pieces span: width * CELL_SIZE + (width - 1) * GAP
 * ═══════════════════════════════════════════════════════════════════════ */

const HERO_COLOR = "#e74c3c";
const HERO_HIGHLIGHT = "#ff7675";

// ADAPT: color values to match your theme, but keep the [base, highlight] pair structure
const PIECE_COLORS: [string, string][] = [
  ["#3498db", "#74b9ff"],
  ["#2ecc71", "#55efc4"],
  ["#f39c12", "#fdcb6e"],
  ["#9b59b6", "#a29bfe"],
  ["#1abc9c", "#00cec9"],
  ["#e67e22", "#fab1a0"],
  ["#34495e", "#636e72"],
  ["#d35400", "#e17055"],
  ["#8e44ad", "#6c5ce7"],
  ["#27ae60", "#00b894"],
];

const PIECE_STYLE_BASE: React.CSSProperties = {
  position: "absolute",
  borderRadius: 10,
  border: "2px solid rgba(255, 255, 255, 0.15)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  touchAction: "none",
  zIndex: 5,
};

const HERO_STYLE_OVERRIDE: React.CSSProperties = {
  borderColor: "rgba(255, 255, 255, 0.25)",
  boxShadow: "0 2px 12px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  zIndex: 6,
};

// Background gradient: radial-gradient(circle at 30% 30%, highlight, baseColor)
function pieceBackground(color: string, highlight: string): string {
  return `radial-gradient(circle at 30% 30%, ${highlight}, ${color})`;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: DIRECTION DETECTION
 *
 * Pure function — no adaptation needed. Use as-is.
 * ═══════════════════════════════════════════════════════════════════════ */

type Direction = "up" | "down" | "left" | "right";

function detectFlickDirection(
  dx: number,
  dy: number,
): Direction | null {
  if (Math.abs(dx) < FLICK_THRESHOLD && Math.abs(dy) < FLICK_THRESHOLD)
    return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: ORIENTATION & MOVE VALIDATION (LOCKED)
 *
 * Pieces can only slide along their orientation axis:
 *   - width > 1, height === 1 → horizontal only
 *   - height > 1, width === 1 → vertical only
 *   - 1x1 pieces → any direction
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: replace with your Piece type (must have id, col, row, width, height)
type Piece = {
  id: string;
  col: number;
  row: number;
  width: number;
  height: number;
  color: string;
  highlight: string;
  isHero: boolean;
};

// ADAPT: replace with your Wall type
type Wall = { col: number; row: number };

// ADAPT: replace with your ExitDef type
type ExitDef = {
  col: number;
  row: number;
  side: "left" | "right" | "top" | "bottom";
};

function orientation(p: Piece): "horizontal" | "vertical" {
  if (p.width > 1 && p.height === 1) return "horizontal";
  if (p.height > 1 && p.width === 1) return "vertical";
  // 1x1 pieces default to horizontal (can move any direction, see canMoveDirection)
  return "horizontal";
}

function canMoveDirection(piece: Piece, dir: Direction): boolean {
  // 1x1 pieces can move any direction
  if (piece.width === 1 && piece.height === 1) return true;
  const o = orientation(piece);
  if (o === "horizontal" && (dir === "left" || dir === "right")) return true;
  if (o === "vertical" && (dir === "up" || dir === "down")) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: SLIDE DISTANCE CALCULATION (LOCKED)
 *
 * Builds an occupancy grid (walls + other pieces), then scans
 * cell-by-cell in the slide direction until blocked.
 * Returns the number of cells the piece can slide (0 = cannot move).
 *
 * Special case: hero piece sliding toward exit can leave the board.
 * ═══════════════════════════════════════════════════════════════════════ */

function buildOccupancy(
  pieces: Piece[],
  excludeId: string,
  walls: Wall[],
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(false),
  );
  for (const w of walls) {
    if (w.row >= 0 && w.row < GRID && w.col >= 0 && w.col < GRID) {
      grid[w.row][w.col] = true;
    }
  }
  for (const p of pieces) {
    if (p.id === excludeId) continue;
    for (let r = p.row; r < p.row + p.height; r++) {
      for (let c = p.col; c < p.col + p.width; c++) {
        if (r >= 0 && r < GRID && c >= 0 && c < GRID) {
          grid[r][c] = true;
        }
      }
    }
  }
  return grid;
}

function slideDistance(
  piece: Piece,
  dir: Direction,
  pieces: Piece[],
  walls: Wall[],
  exit: ExitDef,
): number {
  if (!canMoveDirection(piece, dir)) return 0;

  const occ = buildOccupancy(pieces, piece.id, walls);
  let dist = 0;

  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;

  // ADAPT: hero-toward-exit logic for your exit configuration
  const isHeroTowardExit =
    piece.isHero &&
    ((exit.side === "right" && dir === "right") ||
      (exit.side === "left" && dir === "left") ||
      (exit.side === "top" && dir === "up") ||
      (exit.side === "bottom" && dir === "down"));

  while (true) {
    dist++;
    let blocked = false;
    let offBoard = false;

    for (let r = 0; r < piece.height; r++) {
      for (let c = 0; c < piece.width; c++) {
        const nr = piece.row + r + dy * dist;
        const nc = piece.col + c + dx * dist;

        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) {
          if (isHeroTowardExit) {
            if (exit.side === "right" && piece.row === exit.row && nc >= GRID) {
              offBoard = true;
              continue;
            }
            if (exit.side === "left" && piece.row === exit.row && nc < 0) {
              offBoard = true;
              continue;
            }
            if (exit.side === "bottom" && piece.col === exit.col && nr >= GRID) {
              offBoard = true;
              continue;
            }
            if (exit.side === "top" && piece.col === exit.col && nr < 0) {
              offBoard = true;
              continue;
            }
          }
          blocked = true;
          break;
        }
        if (occ[nr][nc]) {
          blocked = true;
          break;
        }
      }
      if (blocked) break;
    }

    if (blocked) {
      return dist - 1;
    }
    if (offBoard) {
      return dist; // hero exits the board
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: APPLY MOVE (LOCKED)
 *
 * Returns a new pieces array with the target piece slid by `distance`
 * cells in the given direction. Does not mutate the input array.
 * ═══════════════════════════════════════════════════════════════════════ */

function applyMove(
  pieces: Piece[],
  pieceId: string,
  dir: Direction,
  distance: number,
): Piece[] {
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;

  return pieces.map((p) => {
    if (p.id !== pieceId) return p;
    return {
      ...p,
      col: p.col + dx * distance,
      row: p.row + dy * distance,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: CHECK WIN (LOCKED)
 *
 * The hero wins when it slides off the board through the exit.
 * Returns true if the hero piece's bounding box extends past the
 * board edge on the exit side.
 * ═══════════════════════════════════════════════════════════════════════ */

function checkWin(pieces: Piece[], exit: ExitDef): boolean {
  const hero = pieces.find((p) => p.isHero);
  if (!hero) return false;

  if (exit.side === "right") return hero.col + hero.width > GRID;
  if (exit.side === "left") return hero.col < 0;
  if (exit.side === "bottom") return hero.row + hero.height > GRID;
  if (exit.side === "top") return hero.row < 0;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: COORDINATE CONVERSION (LOCKED)
 *
 * Converts a grid cell index to pixel position.
 * Each cell is offset by GAP from the board edge and from neighbors.
 * ═══════════════════════════════════════════════════════════════════════ */

function cellToPixel(cellIndex: number): number {
  return GAP + cellIndex * (CELL_SIZE + GAP);
}

// Multi-cell piece pixel dimensions:
// pxWidth  = piece.width  * CELL_SIZE + (piece.width  - 1) * GAP
// pxHeight = piece.height * CELL_SIZE + (piece.height - 1) * GAP

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: ANIMATION TIMING CONSTANTS (LOCKED)
 *
 * Central reference for all animation durations and easings.
 * These values are mirrored in slide-animation.css.
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIMATION_TIMING = {
  /** Slide transition duration in ms */
  slideDuration: 200,
  /** Slide transition easing */
  slideEase: "ease-out",

  /** Reject shake duration in ms */
  shakeDuration: 160,
  /** Reject shake easing */
  shakeEase: "ease-out",
  /** Reject shake amplitude in px */
  shakeAmplitude: 6,

  /** Win overlay fade-in duration in ms */
  winFadeDuration: 300,
  /** Win card pop-in duration in ms */
  winPopDuration: 300,
  /** Win card pop-in easing (spring overshoot) */
  winPopEase: "cubic-bezier(0.34, 1.56, 0.64, 1)",

  /** Exit indicator pulse period in ms */
  exitPulsePeriod: 1500,

  /** Piece spawn animation duration in ms */
  spawnDuration: 250,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: GESTURE HANDLING (Pointer Events)
 *
 * Wire handlePointerDown onto each piece element, and
 * handlePointerUp onto the board container.
 * Pieces need: touch-action: none;
 * ═══════════════════════════════════════════════════════════════════════ */

type PointerState = {
  pieceId: string | null;
  startX: number;
  startY: number;
};

// In your component:
function GesturePattern() {
  // ADAPT: replace with your game state
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [animating, setAnimating] = useState(false);
  const [animatingPiece, setAnimatingPiece] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<Direction | null>(null);
  const [animDist, setAnimDist] = useState(0);
  const [shakingPiece, setShakingPiece] = useState<string | null>(null);
  const [shakeDir, setShakeDir] = useState<Direction | null>(null);

  const pointerState = useRef<PointerState>({
    pieceId: null,
    startX: 0,
    startY: 0,
  });

  // ADAPT: supply your exit definition
  const exit: ExitDef = { col: GRID, row: 2, side: "right" };
  // ADAPT: supply your walls
  const walls: Wall[] = [];

  const handlePointerDown = useCallback(
    (pieceId: string, e: React.PointerEvent) => {
      if (animating) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      pointerState.current = { pieceId, startX: e.clientX, startY: e.clientY };
    },
    [animating],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const { pieceId, startX, startY } = pointerState.current;
      if (!pieceId || animating) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dir = detectFlickDirection(dx, dy);

      pointerState.current.pieceId = null;

      if (dir === null) return; // gesture too short — ignore

      // Find the piece and attempt the move
      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const dist = slideDistance(piece, dir, pieces, walls, exit);

      if (dist === 0) {
        // Cannot move — play reject shake
        setShakingPiece(pieceId);
        setShakeDir(dir);
        setTimeout(() => {
          setShakingPiece(null);
          setShakeDir(null);
        }, ANIMATION_TIMING.shakeDuration);
        return;
      }

      // Valid move — animate slide, then commit
      setAnimating(true);
      setAnimatingPiece(pieceId);
      setAnimDir(dir);
      setAnimDist(dist);

      setTimeout(() => {
        // Commit state after animation completes
        const newPieces = applyMove(pieces, pieceId, dir, dist);
        setPieces(newPieces);
        setAnimating(false);
        setAnimatingPiece(null);
        setAnimDir(null);
        setAnimDist(0);

        // ADAPT: check win condition, increment move counter, etc.
        if (checkWin(newPieces, exit)) {
          // Handle win
        }
      }, ANIMATION_TIMING.slideDuration);
    },
    [animating, pieces, walls, exit],
  );

  return null; // placeholder
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: PIECE RENDERING
 *
 * Shows how to render pieces with slide animation and shake classes.
 * Each piece is absolutely positioned via cellToPixel().
 * The slide animation uses CSS transform set inline.
 * ═══════════════════════════════════════════════════════════════════════ */

function PieceRenderPattern({
  pieces,
  animatingPiece,
  animDir,
  animDist,
  shakingPiece,
  shakeDir,
  onPointerDown,
}: {
  pieces: Piece[];
  animatingPiece: string | null;
  animDir: Direction | null;
  animDist: number;
  shakingPiece: string | null;
  shakeDir: Direction | null;
  onPointerDown: (pieceId: string, e: React.PointerEvent) => void;
}) {
  return (
    <>
      {pieces.map((p) => {
        const pxWidth = p.width * CELL_SIZE + (p.width - 1) * GAP;
        const pxHeight = p.height * CELL_SIZE + (p.height - 1) * GAP;
        const left = cellToPixel(p.col);
        const top = cellToPixel(p.row);

        // Slide animation offset
        let transform = "";
        const isAnimating = animatingPiece === p.id && animDir && animDist > 0;
        const isShaking = shakingPiece === p.id;

        if (isAnimating) {
          const offsetPx = animDist * STRIDE;
          // --slide-dx and --slide-dy available for CSS if needed
          if (animDir === "right") transform = `translateX(${offsetPx}px)`;
          else if (animDir === "left") transform = `translateX(-${offsetPx}px)`;
          else if (animDir === "down") transform = `translateY(${offsetPx}px)`;
          else if (animDir === "up") transform = `translateY(-${offsetPx}px)`;
        }

        // Build className
        let className = "piece";
        if (isAnimating) className += " piece-sliding";
        if (isShaking && shakeDir) className += ` piece-shake-${shakeDir}`;
        if (p.isHero) className += " piece-hero";

        return (
          <div
            key={p.id}
            className={className}
            style={{
              ...PIECE_STYLE_BASE,
              ...(p.isHero ? HERO_STYLE_OVERRIDE : {}),
              left,
              top,
              width: pxWidth,
              height: pxHeight,
              background: pieceBackground(p.color, p.highlight),
              transform,
              // CSS custom properties for slide distance (available to CSS if needed)
              "--slide-dx": isAnimating && (animDir === "left" || animDir === "right")
                ? `${animDir === "right" ? animDist * STRIDE : -animDist * STRIDE}px`
                : "0px",
              "--slide-dy": isAnimating && (animDir === "up" || animDir === "down")
                ? `${animDir === "down" ? animDist * STRIDE : -animDist * STRIDE}px`
                : "0px",
            } as React.CSSProperties}
            onPointerDown={(e) => onPointerDown(p.id, e)}
          >
            {p.isHero && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "rgba(255, 255, 255, 0.9)",
                  textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
                  letterSpacing: 1,
                }}
              >
                GO
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
