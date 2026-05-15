/**
 * 7-rule bubble structure validation from vision Section 13.
 * Operates on row-major CellMask grids.
 */

import type { CellMask } from '../types';
import { largestConnectedComponent, allComponentSizes } from '../util/flood-fill';

export interface MaskValidationConfig {
  levelId: number;
  cols: number;
  rows: number;
}

interface MaskStats {
  total: number;
  bubbleCount: number;
  gemCount: number;
  coverage: number;
  exposedBubbles: number;
  exposureFraction: number;
}

function computeStats(mask: CellMask[][], cols: number, rows: number): MaskStats {
  let bubbleCount = 0;
  let gemCount = 0;
  let exposedBubbles = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] === 'bubble') {
        bubbleCount++;
        const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mask[nr]![nc] === 'gem') {
            exposedBubbles++;
            break;
          }
        }
      } else {
        gemCount++;
      }
    }
  }

  const total = cols * rows;
  return {
    total,
    bubbleCount,
    gemCount,
    coverage: bubbleCount / total,
    exposedBubbles,
    exposureFraction: bubbleCount > 0 ? exposedBubbles / bubbleCount : 0,
  };
}

/** Convert row-major CellMask to column-major boolean grid for component analysis. */
function toBubbleGrid(mask: CellMask[][], cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: cols }, () => new Array(rows).fill(false) as boolean[]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[c]![r] = mask[r]![c] === 'bubble';
    }
  }
  return grid;
}

function toGemGrid(mask: CellMask[][], cols: number, rows: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: cols }, () => new Array(rows).fill(false) as boolean[]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[c]![r] = mask[r]![c] === 'gem';
    }
  }
  return grid;
}

/** Rule 1: 60–85% of cells must be bubbles. */
function checkCoverage(stats: MaskStats): boolean {
  return stats.coverage >= 0.6 && stats.coverage <= 0.85;
}

/** Rule 2: 10–25% of bubbles must touch a gem orthogonally. */
function checkExposure(stats: MaskStats): boolean {
  return stats.exposureFraction >= 0.10 && stats.exposureFraction <= 0.25;
}

/** Rule 3: 70%+ of bubbles in one connected component. */
function checkCohesion(mask: CellMask[][], cols: number, rows: number, stats: MaskStats): boolean {
  if (stats.bubbleCount === 0) return true;
  const grid = toBubbleGrid(mask, cols, rows);
  const largest = largestConnectedComponent(grid, cols, rows);
  return largest / stats.bubbleCount >= 0.7;
}

/** Rule 4: No isolated bubble groups < 5 cells (before level 16). */
function checkNoSmallClusters(mask: CellMask[][], cols: number, rows: number, levelId: number): boolean {
  if (levelId >= 16) return true;
  const grid = toBubbleGrid(mask, cols, rows);
  const sizes = allComponentSizes(grid, cols, rows);
  return sizes.every(s => s >= 5);
}

/** Rule 5: Max 3 checkerboard 2×2 windows. */
function checkCheckerboardCap(mask: CellMask[][], cols: number, rows: number): boolean {
  let count = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = mask[r]![c];
      const tr = mask[r]![c + 1];
      const bl = mask[r + 1]![c];
      const br = mask[r + 1]![c + 1];
      if (tl !== tr && tl !== bl && tl === br && tr === bl) {
        count++;
        if (count > 3) return false;
      }
    }
  }
  return true;
}

/** Rule 6: Zero gem cells with no orthogonal gem neighbor. */
function checkNoSoloGems(mask: CellMask[][], cols: number, rows: number): boolean {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] !== 'gem') continue;
      let hasGemNeighbor = false;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mask[nr]![nc] === 'gem') {
          hasGemNeighbor = true;
          break;
        }
      }
      if (!hasGemNeighbor) return false;
    }
  }
  return true;
}

/** Rule 7: 55%+ of interface gems (gems touching a bubble) must be in the top half. */
function checkTopEntryBias(mask: CellMask[][], cols: number, rows: number): boolean {
  const halfRow = Math.floor(rows / 2);
  let topInterface = 0;
  let totalInterface = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] !== 'gem') continue;
      let touchesBubble = false;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && mask[nr]![nc] === 'bubble') {
          touchesBubble = true;
          break;
        }
      }
      if (touchesBubble) {
        totalInterface++;
        if (r < halfRow) topInterface++;
      }
    }
  }

  if (totalInterface === 0) return false;
  return topInterface / totalInterface >= 0.55;
}

/** Rule 8: 50%+ of gems must be on the board perimeter. */
function checkPerimeterGems(mask: CellMask[][], cols: number, rows: number, stats: MaskStats): boolean {
  if (stats.gemCount === 0) return false;
  let perimeterGems = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r]![c] !== 'gem') continue;
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        perimeterGems++;
      }
    }
  }
  return perimeterGems / stats.gemCount >= 0.5;
}

/**
 * Full mask validation — applies all rules.
 * Returns `true` if the mask passes all checks.
 */
export function validateMask(
  mask: CellMask[][],
  config: MaskValidationConfig,
): boolean {
  const { cols, rows, levelId } = config;
  const stats = computeStats(mask, cols, rows);

  if (!checkCoverage(stats)) return false;
  if (!checkExposure(stats)) return false;
  if (!checkCohesion(mask, cols, rows, stats)) return false;
  if (!checkNoSmallClusters(mask, cols, rows, levelId)) return false;
  if (!checkCheckerboardCap(mask, cols, rows)) return false;
  if (!checkNoSoloGems(mask, cols, rows)) return false;
  if (!checkTopEntryBias(mask, cols, rows)) return false;
  if (!checkPerimeterGems(mask, cols, rows, stats)) return false;

  return true;
}

/**
 * Relaxed validation for fallback random masks — only coverage + exposure + no solo gems.
 */
export function validateMaskLoose(
  mask: CellMask[][],
  cols: number,
  rows: number,
): boolean {
  const stats = computeStats(mask, cols, rows);
  if (stats.coverage < 0.4 || stats.coverage > 0.85) return false;
  if (stats.exposureFraction < 0.08) return false;
  if (!checkNoSoloGems(mask, cols, rows)) return false;
  return true;
}
