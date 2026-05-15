/**
 * Final validation pass — reject boards that fail hard rules.
 */

import type { LevelGenContext } from '../types';
import type { BoardState } from '../../types';
import { getCell, getCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';
import { floodFill, countSoloGemCellsOnBoard } from '../util/flood-fill';

const MIN_INITIAL_GEM_CELLS = 8;

export function validateBoardPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config } = ctx;

  if (countBlockCells(board) < MIN_INITIAL_GEM_CELLS) return null;
  if (!hasValidGroup(board)) return null;
  if (!allRequestedObstaclesPresent(board, config.obstacleTypes)) return null;

  return ctx;
}

function countBlockCells(board: BoardState): number {
  let count = 0;
  for (const cell of board.cellsById.values()) {
    if (cell.kind === 'block') count++;
  }
  return count;
}

function hasValidGroup(board: BoardState): boolean {
  const visited = new Set<string>();
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      const cell = getCellById(board, cellIdOf(r, c));
      if (!cell || cell.kind !== 'block') { visited.add(key); continue; }

      const group = floodFill(board, r, c, cell.color);
      for (const p of group) visited.add(`${p.row},${p.col}`);
      if (group.length >= 2) return true;
    }
  }
  return false;
}

function allRequestedObstaclesPresent(
  board: BoardState,
  requestedTypes: readonly string[],
): boolean {
  const found = new Set<string>();
  for (const cell of board.cellsById.values()) {
    if (cell.kind === 'obstacle') found.add(cell.obstacleType);
  }

  for (const type of requestedTypes) {
    if (type === 'marshmallow') continue;
    if (!found.has(type)) return false;
  }
  return true;
}
