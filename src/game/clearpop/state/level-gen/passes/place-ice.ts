/**
 * Pass 6: Overlay ice on gem cells near pocket boundaries.
 * Active for level 12+ when 'ice' is in obstacle types.
 * Budget: 15–30% of gem cells, scaling with zone position.
 */

import type { LevelGenContext } from '../types';
import type { GridPos } from '../../types';
import { createObstacle } from '../../obstacle-logic';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

const ZONE_SIZE = 20;
const BASE_FRACTION = 0.15;
const SCALE_FRACTION = 0.15;

export function placeIcePass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config, rng } = ctx;
  const positionInZone = (config.levelId - 1) % ZONE_SIZE;
  const budget = BASE_FRACTION + (positionInZone / ZONE_SIZE) * SCALE_FRACTION;

  const boundaryCells = (ctx.metadata.get('gemBoundaryCells') as GridPos[] | undefined) ?? [];

  const gemCells: GridPos[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (cell && cell.kind === 'block') gemCells.push({ row: r, col: c });
    }
  }

  const targetCount = Math.max(1, Math.round(gemCells.length * budget));

  const candidates = boundaryCells.length > 0
    ? rng.shuffle([...boundaryCells])
    : rng.shuffle([...gemCells]);

  let placed = 0;
  for (const pos of candidates) {
    if (placed >= targetCount) break;
    const cell = getCellById(board, cellIdOf(pos.row, pos.col));
    if (!cell || cell.kind !== 'block') continue;

    setCellById(board, cellIdOf(pos.row, pos.col), createObstacle('ice', { kind: 'block', color: cell.color }));
    placed++;
  }

  return ctx;
}
