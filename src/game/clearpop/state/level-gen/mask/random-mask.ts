import type { SeededRNG } from '../../seeded-rng';
import type { CellMask } from '../types';

/**
 * Fallback: random scatter mask when pocket-first fails.
 * Generates the left half randomly, then mirrors to the right half
 * for visual composition symmetry.
 */
export function buildRandomMask(
  cols: number,
  rows: number,
  rng: SeededRNG,
  targetCoverage = 0.6,
): CellMask[][] {
  const half = Math.floor(cols / 2);
  const mask: CellMask[][] = [];

  for (let r = 0; r < rows; r++) {
    mask[r] = [];
    for (let c = 0; c < half; c++) {
      mask[r]![c] = rng.next() < targetCoverage ? 'bubble' : 'gem';
    }
    if (cols % 2 === 1) {
      mask[r]![half] = rng.next() < targetCoverage ? 'bubble' : 'gem';
    }
    for (let c = 0; c < half; c++) {
      mask[r]![cols - 1 - c] = mask[r]![c]!;
    }
  }

  return mask;
}
