/**
 * Pass 8: Cage isolated gem cells (fewer gem neighbors = harder to free).
 * Active for level 32+ when 'cage' is in obstacle types.
 * Budget: 12–22% of gem cells, scaling with zone position.
 */

import type { LevelGenContext } from '../types';
import type { GridPos } from '../../types';
import { getCell, getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';
import { createObstacle } from '../../obstacle-logic';

const ZONE_SIZE = 20;
const BASE_FRACTION = 0.12;
const SCALE_FRACTION = 0.10;

export function placeCagesPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config, rng } = ctx;
  const positionInZone = (config.levelId - 1) % ZONE_SIZE;
  const budget = BASE_FRACTION + (positionInZone / ZONE_SIZE) * SCALE_FRACTION;

  const scored: { pos: GridPos; neighborCount: number }[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (!cell || cell.kind !== 'block') continue;
      let gemNeighbors = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const n = getCell(board, r + dr, c + dc);
        if (n && n.kind === 'block') gemNeighbors++;
      }
      scored.push({ pos: { row: r, col: c }, neighborCount: gemNeighbors });
    }
  }

  scored.sort((a, b) => a.neighborCount - b.neighborCount);

  const targetCount = Math.max(1, Math.round(scored.length * budget));

  let placed = 0;
  for (const { pos } of scored) {
    if (placed >= targetCount) break;
    const cell = getCellById(board, cellIdOf(pos.row, pos.col));
    if (!cell || cell.kind !== 'block') continue;

    setCellById(board, cellIdOf(pos.row, pos.col), createObstacle('cage', { kind: 'block', color: cell.color }));
    placed++;
  }

  return ctx;
}
