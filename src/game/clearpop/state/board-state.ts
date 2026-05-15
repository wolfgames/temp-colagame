/**
 * Board State — Immutable Operations
 *
 * Pure functions operating on BoardState. No Pixi, no DOM.
 * All mutations return new board copies.
 *
 * Storage is `Map<CellId, BoardCell>` keyed by topology cell ids. Rect
 * topologies use ids of the form `"row,col"` so this module also exposes
 * legacy `row,col` helpers; non-rect callers should use `getCellById` /
 * `setCellById` directly with topology-native ids.
 */

import type {
  BoardState,
  BoardCell,
  BlockCell,
  BlockColor,
  PowerUpCell,
  GridPos,
} from './types';
import { BLOCK_COLORS } from './types';
import type { SeededRNG } from './seeded-rng';
import type { CellId } from '../contracts/topology';
import { parseCellId, cellIdOf } from '../topologies/rect-orth-down';

/**
 * Build an empty board with every rect cell pre-populated as `{kind:'empty'}`.
 * Pre-population matches the prior `cells[r][c]` shape so callers that iterate
 * rect bounds always see a defined cell.
 */
export function createEmptyBoard(cols: number, rows: number): BoardState {
  const cellsById = new Map<CellId, BoardCell>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellsById.set(cellIdOf(r, c), { kind: 'empty' });
    }
  }
  return { cellsById, cols, rows };
}

export function createRandomBoard(
  cols: number,
  rows: number,
  colorCount: number,
  rng: SeededRNG,
): BoardState {
  const palette = BLOCK_COLORS.slice(0, colorCount);
  const cellsById = new Map<CellId, BoardCell>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellsById.set(cellIdOf(r, c), { kind: 'block', color: rng.pick(palette) });
    }
  }
  return { cellsById, cols, rows };
}

export function getCell(board: BoardState, row: number, col: number): BoardCell | null {
  // No rect bounds check — `cellsById.has` is the bounds check for any
  // topology. (row, col) are interpreted as the two numeric parts of a
  // comma-separated CellId, which is hex/radial-compatible.
  return board.cellsById.get(cellIdOf(row, col)) ?? null;
}

export function cloneBoard(board: BoardState): BoardState {
  const next = new Map<CellId, BoardCell>();
  for (const [id, cell] of board.cellsById) {
    next.set(id, { ...cell });
  }
  return { cols: board.cols, rows: board.rows, cellsById: next };
}

export function setCells(
  board: BoardState,
  updates: { pos: GridPos; cell: BoardCell }[],
): BoardState {
  const next = cloneBoard(board);
  for (const { pos, cell } of updates) {
    next.cellsById.set(cellIdOf(pos.row, pos.col), cell);
  }
  return next;
}

export function isPlayableBlock(cell: BoardCell): cell is BlockCell {
  return cell.kind === 'block';
}

export function isPowerUp(cell: BoardCell): cell is PowerUpCell {
  return cell.kind === 'powerup';
}

export function isObstacle(cell: BoardCell): boolean {
  return cell.kind === 'obstacle';
}

export function countObstacles(board: BoardState): number {
  let count = 0;
  for (const cell of board.cellsById.values()) {
    if (cell.kind === 'obstacle') count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// CellId-based access (topology-aware)
// ---------------------------------------------------------------------------

/**
 * Look up a cell by its topology CellId. Returns null for ids not present
 * in the board (treat as out-of-bounds).
 */
export function getCellById(board: BoardState, id: CellId): BoardCell | null {
  return board.cellsById.get(id) ?? null;
}

/**
 * Write a cell by its topology CellId. Silently ignores ids that don't
 * belong to the board's topology (out-of-bounds protection).
 */
export function setCellById(board: BoardState, id: CellId, cell: BoardCell): void {
  if (!board.cellsById.has(id)) return;
  board.cellsById.set(id, cell);
}

/** Convert a GridPos to a topology CellId. */
export function posToCellId(pos: GridPos): CellId {
  return cellIdOf(pos.row, pos.col);
}

/** Convert a CellId back to a GridPos. */
export function cellIdToPos(id: CellId): GridPos {
  return parseCellId(id);
}
