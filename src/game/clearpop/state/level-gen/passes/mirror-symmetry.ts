/**
 * Pass 4: Mirror gem colors from left half to right half
 * for visual composition symmetry.
 */

import type { LevelGenContext } from '../types';
import { enforcePairs } from './color-gems';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

export function mirrorSymmetryPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config } = ctx;
  const halfCols = Math.floor(board.cols / 2);

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < halfCols; c++) {
      const mirrorCol = board.cols - 1 - c;
      const leftCell = getCellById(board, cellIdOf(r, c));
      if (leftCell && (leftCell.kind === 'block' || leftCell.kind === 'obstacle')) {
        setCellById(board, cellIdOf(r, mirrorCol), { ...leftCell });
      }
    }
  }

  enforcePairs(board, config.obstacleTypes.includes('marshmallow'));

  return ctx;
}
