/**
 * Pass 1: Build a pocket-first symmetric bubble/gem mask.
 * Writes `ctx.mask` and stashes pocket metadata for downstream passes.
 */

import type { LevelGenContext, CellMask } from '../types';
import { buildPocketFirstMask } from '../mask/pocket-mask';
import { validateMask } from '../mask/mask-validation';
import type { GridPos } from '../../types';

export function buildPocketMaskPass(ctx: LevelGenContext): LevelGenContext | null {
  const { config, rng } = ctx;
  const result = buildPocketFirstMask(config.cols, config.rows, rng, 48, config.levelId);
  if (!result) return null;

  const mask = pocketResultToRowMajorMask(result.isBubble, config.cols, config.rows);

  if (!validateMask(mask, { levelId: config.levelId, cols: config.cols, rows: config.rows })) {
    return null;
  }

  ctx.mask = mask;
  ctx.metadata.set('pocketBounds', result.pocket);
  ctx.metadata.set('gemBoundaryCells', findGemBoundaryCells(mask, config.cols, config.rows));
  ctx.metadata.set('bubbleMassCenter', computeBubbleMassCenter(result.isBubble, config.cols, config.rows));

  return ctx;
}

/**
 * Convert column-major `isBubble` boolean grid to row-major CellMask grid.
 * Pocket mask uses `isBubble[col][row]`; pipeline uses `mask[row][col]`.
 */
function pocketResultToRowMajorMask(
  isBubble: boolean[][],
  cols: number,
  rows: number,
): CellMask[][] {
  const mask: CellMask[][] = [];
  for (let r = 0; r < rows; r++) {
    mask[r] = [];
    for (let c = 0; c < cols; c++) {
      mask[r]![c] = isBubble[c]![r] ? 'bubble' : 'gem';
    }
  }
  return mask;
}

function findGemBoundaryCells(mask: CellMask[][], cols: number, rows: number): GridPos[] {
  const cells: GridPos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] !== 'gem') continue;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mask[nr]![nc] === 'bubble') {
          cells.push({ row: r, col: c });
          break;
        }
      }
    }
  }
  return cells;
}

function computeBubbleMassCenter(
  isBubble: boolean[][],
  cols: number,
  rows: number,
): GridPos {
  let sumR = 0;
  let sumC = 0;
  let count = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (isBubble[c]![r]) {
        sumR += r;
        sumC += c;
        count++;
      }
    }
  }
  if (count === 0) return { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
  return { row: Math.round(sumR / count), col: Math.round(sumC / count) };
}
