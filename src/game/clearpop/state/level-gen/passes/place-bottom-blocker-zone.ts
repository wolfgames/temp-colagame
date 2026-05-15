/**
 * Pass: Fill the bottom N rows with structured obstacle patterns.
 *
 * Reads `config.bottomBlockerZone` and:
 *   1. Overwrites every cell in the bottom N rows with the `fill` obstacle type.
 *   2. Stamps each overlay rectangle (left-half only) on top of the base fill.
 *      mirrorSymmetryPass mirrors them to the right half automatically.
 *
 * Returns null (pipeline retries) if any overlay extends beyond the zone
 * bounds or exceeds the left half width.
 */

import type { LevelGenContext } from '../types';
import { OBSTACLE_MAX_HP } from '../../types';
import type { ObstacleType } from '../../types';
import { createObstacle } from '../../obstacle-logic';
import { setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

function makeObstacle(type: ObstacleType, trapType?: ObstacleType) {
  if (type === 'safe') {
    const trapped = trapType ?? 'marshmallow';
    return createObstacle('safe', undefined, { obstacleType: trapped, hp: OBSTACLE_MAX_HP[trapped] });
  }
  return { kind: 'obstacle' as const, obstacleType: type, hp: OBSTACLE_MAX_HP[type] };
}

export function placeBottomBlockerZonePass(ctx: LevelGenContext): LevelGenContext | null {
  const { config, board } = ctx;
  const zone = config.bottomBlockerZone;
  if (!zone) return ctx;

  const { rows: zoneRows, fill, overlays } = zone;
  const { cols, rows: boardRows } = board;
  const halfCols = Math.floor(cols / 2);

  // Validate overlays fit before mutating anything.
  for (const ov of overlays ?? []) {
    const ovColEnd = ov.colOffset + ov.colCount;
    const ovRowEnd = ov.rowOffset + ov.rowCount;
    if (ovColEnd > halfCols || ovRowEnd > zoneRows || ov.colOffset < 0 || ov.rowOffset < 0) {
      return null;
    }
  }

  // Row index where the zone starts (inclusive). Zone row 0 = bottom board row.
  const zoneStartBoardRow = boardRows - zoneRows;

  // Step 1: Fill entire zone with base type.
  for (let r = zoneStartBoardRow; r < boardRows; r++) {
    for (let c = 0; c < cols; c++) {
      setCellById(board, cellIdOf(r, c), makeObstacle(fill));
    }
  }

  // Step 2: Stamp overlays on left half only.
  // When overlay type is 'safe', it traps the zone's fill obstacle inside.
  for (const ov of overlays ?? []) {
    for (let zr = ov.rowOffset; zr < ov.rowOffset + ov.rowCount; zr++) {
      // zone row 0 = boardRows - 1 (bottom), zone row increases upward
      const boardRow = boardRows - 1 - zr;
      for (let c = ov.colOffset; c < ov.colOffset + ov.colCount; c++) {
        setCellById(board, cellIdOf(boardRow, c), makeObstacle(ov.type, fill));
      }
    }
  }

  return ctx;
}
