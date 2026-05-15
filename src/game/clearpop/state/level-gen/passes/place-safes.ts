/**
 * Pass 9: Place safes near the board's mass center.
 * Prefers converting existing marshmallow cells; falls back to blocks
 * when marshmallow isn't active in the level.
 */

import type { LevelGenContext } from '../types';
import type { GridPos, ObstacleType } from '../../types';
import { OBSTACLE_MAX_HP } from '../../types';
import { createObstacle } from '../../obstacle-logic';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

const ZONE_SIZE = 20;
const BASE_FRACTION = 0.10;
const SCALE_FRACTION = 0.12;

export function placeSafesPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config } = ctx;
  const positionInZone = (config.levelId - 1) % ZONE_SIZE;
  const budget = BASE_FRACTION + (positionInZone / ZONE_SIZE) * SCALE_FRACTION;

  const massCenter = (ctx.metadata.get('bubbleMassCenter') as GridPos | undefined)
    ?? { row: Math.floor(board.rows / 2), col: Math.floor(board.cols / 2) };

  const bubbleTargets: { pos: GridPos; dist: number }[] = [];
  const blockTargets: { pos: GridPos; dist: number }[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (!cell) continue;
      const dist = Math.abs(r - massCenter.row) + Math.abs(c - massCenter.col);
      if (cell.kind === 'obstacle' && cell.obstacleType === 'marshmallow') {
        bubbleTargets.push({ pos: { row: r, col: c }, dist });
      } else if (cell.kind === 'block') {
        blockTargets.push({ pos: { row: r, col: c }, dist });
      }
    }
  }

  const pool = bubbleTargets.length > 0 ? bubbleTargets : blockTargets;
  pool.sort((a, b) => a.dist - b.dist);

  const targetCount = Math.max(1, Math.round(pool.length * budget));

  const trappableTypes: ObstacleType[] = config.obstacleTypes.filter((t: ObstacleType) => t !== 'safe');
  const fallback: ObstacleType = 'marshmallow';

  let placed = 0;
  for (const { pos } of pool) {
    if (placed >= targetCount) break;
    const pickedType: ObstacleType = trappableTypes.length > 0
      ? trappableTypes[Math.floor(ctx.rng.next() * trappableTypes.length)]!
      : fallback;
    const trappedObstacle = { obstacleType: pickedType, hp: OBSTACLE_MAX_HP[pickedType] };
    setCellById(board, cellIdOf(pos.row, pos.col), createObstacle('safe', undefined, trappedObstacle));
    placed++;
  }

  return ctx;
}
