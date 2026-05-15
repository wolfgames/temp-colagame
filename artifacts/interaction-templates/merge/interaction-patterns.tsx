/**
 * Merge Interaction Archetype — React/JS Patterns
 *
 * This file contains the definitive patterns for merge interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                 │
 * │ LOCKED — do not change values, logic, or structure:             │
 * │   - Merge rule: same tier + adjacent (4-dir) → tier + 1        │
 * │   - Scoring: Math.round(10 * Math.pow(resultTier, 2))          │
 * │   - canMerge() logic                                            │
 * │   - applyMerge() logic                                          │
 * │   - isAdjacent() — orthogonal only (dr + dc === 1)             │
 * │   - Ghost piece pattern (fixed, translate -50%/-50%, scale 1.1) │
 * │   - Drop target highlight logic                                 │
 * │   - Tier color palette (8-tier radial gradients)                │
 * │   - Animation timing: merge 280ms, spawn 250ms, snap 200ms     │
 * │                                                                 │
 * │ ADAPTABLE — change only where marked // ADAPT:                  │
 * │   - Type names (use your game's Piece, Board, Tier types)       │
 * │   - Store API calls (your merge/validate/setState functions)    │
 * │   - Board dimensions (ROWS, COLS — default 5×5)                 │
 * │   - CELL_SIZE (default 70) and GAP (default 6)                  │
 * │   - MAX_TIER (default 8)                                        │
 * │   - Tier names/themes (display labels for each tier level)      │
 * │   - Starting board configuration                                │
 * │                                                                 │
 * │ If you find an improvement, do NOT apply it in the game.        │
 * │ Note it for archetype evolution instead.                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent — copy what you need.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const CELL_SIZE = 70;  // ADAPT: match your cell size
const GAP = 6;         // ADAPT: match your grid gap
const STRIDE = CELL_SIZE + GAP;
const ROWS = 5;        // ADAPT: match your board row count
const COLS = 5;        // ADAPT: match your board column count
const MAX_TIER = 8;    // ADAPT: highest tier a piece can reach
const BOARD_PAD = 10;  // padding inside the board container

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1b: ANIMATION TIMING CONSTANTS (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const MERGE_ANIM_MS = 280;  // merge-pop duration
const SPAWN_ANIM_MS = 250;  // spawn-in duration
const SNAP_ANIM_MS = 200;   // snap-back duration
const PULSE_ANIM_MS = 200;  // merge-pulse duration

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: use your game's type names
type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Piece {
  id: string;
  tier: Tier;
}

type Cell = Piece | null;
type Board = Cell[][];

interface Position {
  row: number;
  col: number;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TIER COLOR PALETTE (LOCKED)
 *
 * 8 tiers with distinct radial gradients. Pieces are colored rounded
 * rectangles — do NOT use circles, hexagons, diamonds, stars, emoji,
 * or SVG shapes. Color + tier number distinguish pieces.
 *
 * Pieces fill 100% of their cell. Spacing comes from GAP, not from
 * shrinking the piece. Do NOT use width/height < 100% or clipPath.
 * ═══════════════════════════════════════════════════════════════════════ */

const TIER_COLORS: Record<Tier, { base: string; light: string }> = {
  1: { base: "#dc2626", light: "#f87171" },   // red
  2: { base: "#2563eb", light: "#60a5fa" },   // blue
  3: { base: "#16a34a", light: "#4ade80" },   // green
  4: { base: "#eab308", light: "#facc15" },   // yellow
  5: { base: "#9333ea", light: "#c084fc" },   // purple
  6: { base: "#f97316", light: "#fdba74" },   // orange
  7: { base: "#ec4899", light: "#f9a8d4" },   // pink
  8: { base: "#06b6d4", light: "#67e8f9" },   // cyan
};

function pieceGradient(tier: Tier): string {
  const c = TIER_COLORS[tier];
  return `radial-gradient(circle at 35% 35%, ${c.light}, ${c.base})`;
}

const PIECE_STYLE_BASE: React.CSSProperties = {
  borderRadius: 10,
  fontSize: 26,
  fontWeight: 800,
  color: "#fff",
  textShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: BOARD UTILITIES
 * ═══════════════════════════════════════════════════════════════════════ */

let idCounter = 0;

function nextId(): string {
  return `p${++idCounter}`;
}

function resetIdCounter(): void {
  idCounter = 0;
}

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function getEmptyCells(board: Board): Position[] {
  const empties: Position[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) empties.push({ row: r, col: c });
    }
  }
  return empties;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: ADJACENCY AND MERGE VALIDATION (LOCKED)
 *
 * Adjacency is 4-directional (orthogonal) only — no diagonals.
 * canMerge requires: both cells occupied, same tier, below max, adjacent.
 * ═══════════════════════════════════════════════════════════════════════ */

function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1; // orthogonal only
}

function canMerge(board: Board, from: Position, to: Position): boolean {
  const src = board[from.row][from.col];
  const dst = board[to.row][to.col];
  if (!src || !dst) return false;
  if (src.tier !== dst.tier) return false;
  if (src.tier >= MAX_TIER) return false;
  if (!isAdjacent(from, to)) return false;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: MERGE EXECUTION (LOCKED)
 *
 * Create tier+1 at target position, clear source position.
 * Returns the new board and the resulting tier.
 * ═══════════════════════════════════════════════════════════════════════ */

function applyMerge(
  board: Board,
  from: Position,
  to: Position,
): { board: Board; newTier: Tier } {
  const newBoard = cloneBoard(board);
  const src = newBoard[from.row][from.col]!;
  const newTier = (src.tier + 1) as Tier;
  newBoard[to.row][to.col] = { id: nextId(), tier: newTier };
  newBoard[from.row][from.col] = null;
  return { board: newBoard, newTier };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: SPAWN PIECE
 *
 * Places a tier-1 piece in a random empty cell.
 * Returns null if the board is full.
 * ═══════════════════════════════════════════════════════════════════════ */

function spawnPiece(board: Board): { board: Board; pos: Position } | null {
  const empties = getEmptyCells(board);
  if (empties.length === 0) return null;
  const pos = empties[Math.floor(Math.random() * empties.length)];
  const newBoard = cloneBoard(board);
  newBoard[pos.row][pos.col] = { id: nextId(), tier: 1 };
  return { board: newBoard, pos };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: WIN / LOSE DETECTION
 * ═══════════════════════════════════════════════════════════════════════ */

function checkWin(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.tier === MAX_TIER) return true;
    }
  }
  return false;
}

function checkLose(board: Board): boolean {
  const empties = getEmptyCells(board);
  if (empties.length > 0) return false;
  // Board is full — check if any adjacent pair can merge
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      // Check right and down neighbors (covers all pairs)
      if (c + 1 < COLS && board[r][c + 1]?.tier === cell.tier) return false;
      if (r + 1 < ROWS && board[r + 1][c]?.tier === cell.tier) return false;
    }
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: SCORING (LOCKED)
 *
 * Score for a merge = 10 × resultTier²
 * ═══════════════════════════════════════════════════════════════════════ */

function mergeScore(resultTier: Tier): number {
  return Math.round(10 * Math.pow(resultTier, 2));
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: COORDINATE CONVERSION
 *
 * Converts pointer clientX/clientY to board row/col.
 * Accounts for board padding and gap between cells.
 * ═══════════════════════════════════════════════════════════════════════ */

function posFromPointer(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
): Position | null {
  const x = clientX - boardRect.left - BOARD_PAD;
  const y = clientY - boardRect.top - BOARD_PAD;
  const col = Math.floor(x / STRIDE);
  const row = Math.floor(y / STRIDE);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  // Reject clicks in the gap between cells
  const cellX = x - col * STRIDE;
  const cellY = y - row * STRIDE;
  if (cellX > CELL_SIZE || cellY > CELL_SIZE) return null;
  return { row, col };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 11: DRAG GESTURE HANDLING (Pointer Events)
 *
 * Wire pointerdown on each piece, pointermove and pointerup on the
 * board wrapper. The board wrapper needs: touch-action: none;
 *
 * KEY PRINCIPLES:
 * - pointerdown starts drag, captures pointer
 * - pointermove updates ghost position + highlights valid target
 * - pointerup validates drop: merge if valid, snap-back if not
 * - Ghost piece renders at pointer position (fixed, not in grid)
 * - Real piece shows opacity 0.3 during drag
 * ═══════════════════════════════════════════════════════════════════════ */

type DragState = {
  from: Position;
  tier: Tier;
  pointerX: number;
  pointerY: number;
};

function DragGesturePattern() {
  // ADAPT: replace with your game state and locked check
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<Position | null>(null);
  const [animatingCells, setAnimatingCells] = useState<Map<string, string>>(
    new Map(),
  );
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const cellKey = (r: number, c: number) => `${r},${c}`;

  const getBoardRect = useCallback((): DOMRect | null => {
    return boardRef.current?.getBoundingClientRect() ?? null;
  }, []);

  // ── pointerdown: start drag ──────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      if (locked) return;
      const piece = board[row][col];
      if (!piece) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDragState({
        from: { row, col },
        tier: piece.tier,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });
    },
    [board, locked],
  );

  // ── pointermove: update ghost + highlight ─────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      setDragState((prev) =>
        prev ? { ...prev, pointerX: e.clientX, pointerY: e.clientY } : null,
      );

      const rect = getBoardRect();
      if (!rect) return;
      const pos = posFromPointer(e.clientX, e.clientY, rect);
      if (pos && dragRef.current) {
        const from = dragRef.current.from;
        if (pos.row !== from.row || pos.col !== from.col) {
          if (canMerge(board, from, pos)) {
            setHighlightTarget(pos);
            return;
          }
        }
      }
      setHighlightTarget(null);
    },
    [board, getBoardRect],
  );

  // ── pointerup: validate drop or snap back ─────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      e.preventDefault();

      const rect = getBoardRect();
      if (rect) {
        const pos = posFromPointer(e.clientX, e.clientY, rect);
        if (pos && canMerge(board, ds.from, pos)) {
          // ── Valid merge: animate, then commit ───────────────────
          executeMerge(ds.from, pos);
          setDragState(null);
          setHighlightTarget(null);
          return;
        }
      }

      // ── Invalid drop: snap-back animation ─────────────────────
      const key = cellKey(ds.from.row, ds.from.col);
      setAnimatingCells((prev) => new Map(prev).set(key, "snapping"));
      setTimeout(() => {
        setAnimatingCells((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }, SNAP_ANIM_MS);

      setDragState(null);
      setHighlightTarget(null);
    },
    [board, getBoardRect],
  );

  // ── Cancel drag if pointer leaves window ──────────────────────────
  useEffect(() => {
    const cancel = () => {
      setDragState(null);
      setHighlightTarget(null);
    };
    window.addEventListener("blur", cancel);
    return () => window.removeEventListener("blur", cancel);
  }, []);

  // ── Execute merge: animate first, commit state after ──────────────
  // ADAPT: wire into your game's state management
  const executeMerge = (from: Position, to: Position) => {
    setLocked(true);
    const result = applyMerge(board, from, to);
    const points = mergeScore(result.newTier);

    // 1. Apply merge-pop animation at target
    const mergeKey = cellKey(to.row, to.col);
    setAnimatingCells((prev) => new Map(prev).set(mergeKey, "merging"));
    setBoard(result.board);
    setScore((s) => s + points);

    setTimeout(() => {
      setAnimatingCells((prev) => {
        const next = new Map(prev);
        next.delete(mergeKey);
        return next;
      });

      // 2. Check win
      if (checkWin(result.board)) {
        // ADAPT: trigger win state
        setLocked(false);
        return;
      }

      // 3. Spawn new piece with spawn animation
      const spawnResult = spawnPiece(result.board);
      if (spawnResult) {
        const spawnKey = cellKey(spawnResult.pos.row, spawnResult.pos.col);
        setAnimatingCells((prev) => new Map(prev).set(spawnKey, "spawning"));
        setBoard(spawnResult.board);

        setTimeout(() => {
          setAnimatingCells((prev) => {
            const next = new Map(prev);
            next.delete(spawnKey);
            return next;
          });

          // 4. Check lose
          if (checkLose(spawnResult.board)) {
            // ADAPT: trigger lose state
          }
          setLocked(false);
        }, SPAWN_ANIM_MS);
      } else {
        // Board full, no spawn possible — check lose
        if (checkLose(result.board)) {
          // ADAPT: trigger lose state
        }
        setLocked(false);
      }
    }, MERGE_ANIM_MS);
  };

  return null; // placeholder — see SECTION 12 for render pattern
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 12: BOARD RENDERING PATTERN
 *
 * Shows the grid, pieces with animation classes, and ghost piece.
 * ═══════════════════════════════════════════════════════════════════════ */

function BoardRenderPattern({
  board,
  dragState,
  highlightTarget,
  animatingCells,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  boardRef,
}: {
  board: Board;
  dragState: DragState | null;
  highlightTarget: Position | null;
  animatingCells: Map<string, string>;
  onPointerDown: (e: React.PointerEvent, row: number, col: number) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  boardRef: React.RefObject<HTMLDivElement>;
}) {
  const cellKey = (r: number, c: number) => `${r},${c}`;

  return (
    <div className="board-wrapper" style={{ touchAction: "none" }}>
      <div
        className="board"
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          /* clear drag state */
        }}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const piece = board[r][c];
            const key = cellKey(r, c);
            const isDragging =
              dragState &&
              dragState.from.row === r &&
              dragState.from.col === c;
            const isTarget =
              highlightTarget &&
              highlightTarget.row === r &&
              highlightTarget.col === c;
            const animClass = animatingCells.get(key) || "";

            return (
              <div
                key={key}
                className={`cell${isTarget ? " drop-target" : ""}`}
              >
                {piece && (
                  <div
                    className={`piece${isDragging ? " dragging" : ""}${animClass ? " " + animClass : ""}`}
                    style={{
                      ...PIECE_STYLE_BASE,
                      background: pieceGradient(piece.tier),
                    }}
                    onPointerDown={(e) => onPointerDown(e, r, c)}
                  >
                    {piece.tier}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Ghost piece following pointer during drag */}
      {dragState && (
        <div
          className="ghost-piece"
          style={{
            left: dragState.pointerX,
            top: dragState.pointerY,
            background: pieceGradient(dragState.tier),
          }}
        >
          {dragState.tier}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 13: STARTING BOARD (ADAPTABLE)
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: number of starting pieces, tier distribution
function createStartingBoard(): Board {
  resetIdCounter();
  let board = createEmptyBoard();
  const empties = getEmptyCells(board);
  for (let i = 0; i < 5; i++) {  // ADAPT: starting piece count
    const idx = Math.floor(Math.random() * empties.length);
    const pos = empties.splice(idx, 1)[0];
    const tier: Tier = Math.random() < 0.6 ? 1 : 2; // ADAPT: starting tier mix
    board[pos.row][pos.col] = { id: nextId(), tier };
  }
  return board;
}
