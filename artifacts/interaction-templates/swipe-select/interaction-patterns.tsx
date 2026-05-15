/**
 * Swipe-Select Interaction Archetype — React/JS Patterns
 *
 * This file contains the definitive patterns for swipe-select interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                 │
 * │ LOCKED — do not change values, logic, or structure:             │
 * │   - isAdjacent() — 8-directional, use as-is                    │
 * │   - Path continuity: adjacent cells, no revisiting              │
 * │   - Backtrack: returning to second-to-last cell pops last       │
 * │   - scoreWord() — 10 × length^1.8, rounded                     │
 * │   - Letter frequency WEIGHTS                                    │
 * │   - findAllWords() DFS logic and depth cap (8)                  │
 * │   - getCellFromPointer() coordinate math                        │
 * │   - Animation timing: selection 100ms, valid 300ms,             │
 * │     invalid 160ms, score float 800ms                            │
 * │                                                                 │
 * │ ADAPTABLE — change only where marked // ADAPT:                  │
 * │   - Dictionary source (inline, API, file import)                │
 * │   - Validation function (dictionary lookup, custom rules)       │
 * │   - Board dimensions (ROWS, COLS — default 5×5)                 │
 * │   - Type names (use your game's Cell, Coord types)              │
 * │   - Store API calls (your state management functions)           │
 * │                                                                 │
 * │ If you find an improvement, do NOT apply it in the game.        │
 * │ Note it for archetype evolution instead.                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent — copy what you need.
 */

import React, { useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const CELL_SIZE = 60;            // ADAPT: match your cell size
const GAP = 4;                   // ADAPT: match your grid gap
const STRIDE = CELL_SIZE + GAP;  // computed — do not set directly
const ROWS = 5;                  // ADAPT: board row count
const COLS = 5;                  // ADAPT: board column count
const BOARD_PX_W = CELL_SIZE * COLS + GAP * (COLS - 1);
const BOARD_PX_H = CELL_SIZE * ROWS + GAP * (ROWS - 1);

/* Animation timing (LOCKED) */
const ANIM = {
  SELECTION_TRANSITION: 100,   // ms — cell scale transition
  VALID_PULSE: 300,            // ms — green pulse keyframe
  INVALID_SHAKE: 160,          // ms — red shake keyframe
  SCORE_FLOAT: 800,            // ms — score popup float-out
  POP_IN: 200,                 // ms — found-word chip entrance
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1b: CELL VISUAL STYLE (LOCKED)
 *
 * Cells are rounded rectangles with a flat background.
 * Do NOT use circles, hexagons, or irregular shapes.
 * Letters are centered, bold, uppercase.
 * Cells fill 100% of their grid slot — spacing comes from GAP.
 * ═══════════════════════════════════════════════════════════════════════ */

const CELL_STYLE_BASE: React.CSSProperties = {
  borderRadius: 10,
  border: "2px solid transparent",
  transition: "transform 0.1s ease, border-color 0.1s ease, background 0.1s ease",
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: replace with your game's types
type CellCoord = { row: number; col: number };
type Cell = { row: number; col: number; letter: string };
type CellState = "idle" | "valid" | "invalid";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: ADJACENCY CHECK (LOCKED)
 *
 * 8-directional adjacency — includes diagonals.
 * Two cells are adjacent if they differ by at most 1 in both row and col,
 * and are not the same cell.
 * ═══════════════════════════════════════════════════════════════════════ */

function isAdjacent(a: CellCoord, b: CellCoord): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: PATH HELPERS (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function isInPath(path: CellCoord[], row: number, col: number): boolean {
  return path.some((p) => p.row === row && p.col === col);
}

function pathToWord(board: Cell[][], path: CellCoord[]): string {
  return path.map((p) => board[p.row][p.col].letter).join("").toLowerCase();
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: COORDINATE CONVERSION (LOCKED)
 *
 * Converts a pointer event's clientX/clientY into a grid CellCoord.
 * Returns null if the pointer is in a gap or outside the board.
 * ═══════════════════════════════════════════════════════════════════════ */

function getCellFromPointer(
  boardEl: HTMLDivElement,
  clientX: number,
  clientY: number,
): CellCoord | null {
  const rect = boardEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
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
 * SECTION 6: WORD VALIDATION & SCORING (LOCKED formulas)
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: replace with your dictionary source (import, fetch, inline Set)
declare const DICTIONARY: Set<string>;

// ADAPT: swap in your own validation if not using a plain dictionary lookup
function isValidWord(word: string): boolean {
  return DICTIONARY.has(word);
}

/** Scoring formula — LOCKED: 10 × length^1.8, rounded */
function scoreWord(wordLength: number): number {
  return Math.round(10 * Math.pow(wordLength, 1.8));
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: BOARD GENERATION (LOCKED weights, ADAPT dimensions)
 *
 * Uses a seeded PRNG and weighted letter frequencies to produce boards
 * rich in common English letters.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Seeded PRNG — mulberry32 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Letter frequency weights — LOCKED */
const WEIGHTS: Record<string, number> = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, R: 6,
  H: 5, L: 4, D: 4, C: 3, U: 3, M: 3, W: 2, F: 2,
  G: 2, Y: 2, P: 2, B: 2, V: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1,
};

const LETTER_POOL: string[] = [];
for (const [letter, weight] of Object.entries(WEIGHTS)) {
  for (let i = 0; i < weight; i++) LETTER_POOL.push(letter);
}

function generateBoard(seed: number): Cell[][] {
  const rng = mulberry32(seed);
  const board: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {        // ADAPT: uses ROWS
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) {       // ADAPT: uses COLS
      const idx = Math.floor(rng() * LETTER_POOL.length);
      row.push({ row: r, col: c, letter: LETTER_POOL[idx] });
    }
    board.push(row);
  }
  return board;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: FIND ALL WORDS — DFS (LOCKED)
 *
 * Discovers every valid word reachable by adjacent paths on the board.
 * Depth-capped at 8 letters. Minimum word length is 3.
 * ═══════════════════════════════════════════════════════════════════════ */

function findAllWords(board: Cell[][]): string[] {
  const found = new Set<string>();

  function dfs(path: CellCoord[], word: string) {
    if (word.length >= 3 && isValidWord(word)) {
      found.add(word);
    }
    if (word.length >= 8) return;         // depth cap — LOCKED

    const last = path[path.length - 1];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = last.row + dr;
        const nc = last.col + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;  // ADAPT: uses ROWS/COLS
        if (isInPath(path, nr, nc)) continue;
        const nextCoord: CellCoord = { row: nr, col: nc };
        const nextWord = word + board[nr][nc].letter.toLowerCase();
        path.push(nextCoord);
        dfs(path, nextWord);
        path.pop();
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {        // ADAPT: uses ROWS
    for (let c = 0; c < COLS; c++) {       // ADAPT: uses COLS
      dfs([{ row: r, col: c }], board[r][c].letter.toLowerCase());
    }
  }

  return Array.from(found).sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: PATH BUILDING — POINTER EVENT HANDLERS (LOCKED logic)
 *
 * Wire pointerdown, pointermove, pointerup, and pointercancel onto the
 * board container element. The board element needs:
 *   touch-action: none; position: relative;
 *
 * Path building rules (LOCKED):
 *   - pointerdown starts a new path at the touched cell
 *   - pointermove extends the path if the cell is adjacent and unvisited
 *   - pointermove BACKTRACKS if the cell is the second-to-last in the path
 *   - pointerup ends the path and triggers validation
 * ═══════════════════════════════════════════════════════════════════════ */

function PathBuildingPattern() {
  // ADAPT: replace with your game's state management
  const boardRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);

  // ADAPT: these would come from your state (useState, zustand, etc.)
  let board: Cell[][] = [];
  let path: CellCoord[] = [];
  let animating = false;
  const setPath = (_p: CellCoord[]) => {};           // ADAPT: your setter
  const setCellStates = (_s: CellState[][]) => {};    // ADAPT: your setter

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (animating) return;
      const el = boardRef.current;
      if (!el) return;
      const coord = getCellFromPointer(el, e.clientX, e.clientY);
      if (!coord) return;

      selectingRef.current = true;
      el.setPointerCapture(e.pointerId);
      setPath([coord]);                               // start new path
    },
    [animating],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!selectingRef.current || animating) return;
      const el = boardRef.current;
      if (!el) return;
      const coord = getCellFromPointer(el, e.clientX, e.clientY);
      if (!coord) return;

      // Already the head of the path — ignore
      const last = path[path.length - 1];
      if (last && last.row === coord.row && last.col === coord.col) return;

      // BACKTRACK: if coord is the second-to-last cell, pop the last cell
      if (path.length >= 2) {
        const prev = path[path.length - 2];
        if (prev.row === coord.row && prev.col === coord.col) {
          setPath(path.slice(0, -1));
          return;
        }
      }

      // EXTEND: cell must be adjacent to head and not already in path
      if (!last || !isAdjacent(last, coord)) return;
      if (isInPath(path, coord.row, coord.col)) return;

      setPath([...path, coord]);
    },
    [animating, path],
  );

  const handlePointerUp = useCallback(() => {
    if (!selectingRef.current) return;
    selectingRef.current = false;

    // Validate the completed path
    if (path.length < 3) {
      // Too short — clear without feedback
      setPath([]);
      return;
    }

    const word = pathToWord(board, path);

    if (isValidWord(word)) {
      // ADAPT: update your score, found-words list, etc.
      const points = scoreWord(word.length);

      // Flash valid state on path cells, then clear after VALID_PULSE
      // ADAPT: set cell states to "valid" for cells in path
      setTimeout(() => {
        setPath([]);
        // ADAPT: reset cell states to "idle"
      }, ANIM.VALID_PULSE);
    } else {
      // Flash invalid state on path cells, then clear after INVALID_SHAKE
      // ADAPT: set cell states to "invalid" for cells in path
      setTimeout(() => {
        setPath([]);
        // ADAPT: reset cell states to "idle"
      }, ANIM.INVALID_SHAKE);
    }
  }, [path, board]);

  return null; // placeholder — wire handlers onto your board JSX
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: SVG PATH LINE RENDERING (LOCKED)
 *
 * Render this SVG inside your board container.
 * It draws a line through the centers of selected cells.
 * ═══════════════════════════════════════════════════════════════════════ */

function PathLineOverlay({ path }: { path: CellCoord[] }) {
  if (path.length < 2) return null;

  const d = path
    .map((p, i) => {
      const cx = p.col * STRIDE + CELL_SIZE / 2;
      const cy = p.row * STRIDE + CELL_SIZE / 2;
      return `${i === 0 ? "M" : "L"} ${cx} ${cy}`;
    })
    .join(" ");

  return (
    <svg
      className="path-svg"
      width={BOARD_PX_W}
      height={BOARD_PX_H}
    >
      <path d={d} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 11: CELL RENDERING PATTERN (LOCKED structure)
 *
 * Shows how to render a single cell with selection, valid, and invalid
 * states. Wire into your board's map loop.
 * ═══════════════════════════════════════════════════════════════════════ */

function CellRenderPattern({
  cell,
  inPath,
  pathIndex,
  state,
}: {
  cell: Cell;
  inPath: boolean;
  pathIndex: number;
  state: CellState;
}) {
  let cls = "cell";
  if (inPath) cls += " cell-selected";
  if (state === "valid") cls += " cell-valid";
  if (state === "invalid") cls += " cell-invalid";

  return (
    <div
      className={cls}
      style={{
        ...CELL_STYLE_BASE,
        position: "absolute",
        left: cell.col * STRIDE,
        top: cell.row * STRIDE,
        width: CELL_SIZE,
        height: CELL_SIZE,
        zIndex: inPath ? 3 : 1,
      }}
    >
      <span className="cell-letter">{cell.letter}</span>
      {inPath && pathIndex >= 0 && (
        <span className="cell-index">{pathIndex + 1}</span>
      )}
    </div>
  );
}
