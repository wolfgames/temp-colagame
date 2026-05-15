/**
 * Pass: Pre-place stone (marshmallow) obstacles on the board.
 * Count scales with level — early levels have few, later levels get packed.
 */

import type { LevelGenContext } from '../types';
import { OBSTACLE_MAX_HP } from '../../types';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

/** How many stones to place at each level tier */
function stoneCount(levelId: number): number {
  if (levelId <= 1) return 0;
  return Math.min((levelId - 1) * 5, 30);
}

export function placeStonesPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config, rng } = ctx;
  const count = stoneCount(config.levelId);
  if (count === 0) return ctx;

  const halfCols = Math.floor(board.cols / 2);

  // Place on left half only — mirrorSymmetryPass will copy to right half.
  // Each left-half stone becomes 2 after mirror, so place half the target count.
  const leftCount = Math.ceil(count / 2);

  const candidates: { row: number; col: number }[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < halfCols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (cell && cell.kind === 'block') {
        candidates.push({ row: r, col: c });
      }
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }

  const obstacle = { kind: 'obstacle' as const, obstacleType: 'marshmallow' as const, hp: OBSTACLE_MAX_HP.marshmallow };
  const toPlace = Math.min(leftCount, candidates.length);
  for (let i = 0; i < toPlace; i++) {
    const pos = candidates[i]!;
    setCellById(board, cellIdOf(pos.row, pos.col), { ...obstacle });
  }

  return ctx;
}
