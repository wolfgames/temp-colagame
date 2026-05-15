/**
 * Pass 7: Overlay jelly on gem cells, preferring bottom half.
 * Active for level 20+ when 'jelly' is in obstacle types.
 * Budget: 15–27% of gem cells, scaling with zone position.
 */

import type { LevelGenContext } from '../types';
import type { GridPos } from '../../types';
import { createObstacle } from '../../obstacle-logic';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

const ZONE_SIZE = 20;
const BASE_FRACTION = 0.15;
const SCALE_FRACTION = 0.12;

export function placeJellyPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config, rng } = ctx;
  const positionInZone = (config.levelId - 1) % ZONE_SIZE;
  const budget = BASE_FRACTION + (positionInZone / ZONE_SIZE) * SCALE_FRACTION;

  const halfRow = Math.floor(board.rows / 2);

  const bottomGems: GridPos[] = [];
  const topGems: GridPos[] = [];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (!cell || cell.kind !== 'block') continue;
      if (r >= halfRow) bottomGems.push({ row: r, col: c });
      else topGems.push({ row: r, col: c });
    }
  }

  const allGemCount = bottomGems.length + topGems.length;
  const targetCount = Math.max(1, Math.round(allGemCount * budget));

  const candidates = [...rng.shuffle([...bottomGems]), ...rng.shuffle([...topGems])];

  let placed = 0;
  for (const pos of candidates) {
    if (placed >= targetCount) break;
    const cell = getCellById(board, cellIdOf(pos.row, pos.col));
    if (!cell || cell.kind !== 'block') continue;

    setCellById(board, cellIdOf(pos.row, pos.col), createObstacle('jelly', { kind: 'block', color: cell.color }));
    placed++;
  }

  return ctx;
}
