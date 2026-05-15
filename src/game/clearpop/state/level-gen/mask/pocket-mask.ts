/**
 * Pocket-first layout: carve gem pockets on the left half, mirror to the right,
 * treat everything else as blockers (bubbles). "Shape first, blockers second."
 */

import type { SeededRNG } from '../../seeded-rng';
import { countSoloGemCellsInMask } from '../util/flood-fill';

const MIN_INITIAL_GEM_CELLS = 8;

export const POCKET_DIMENSIONS: ReadonlyArray<{ w: number; h: number }> = [
  { w: 1, h: 3 },
  { w: 3, h: 1 },
  { w: 2, h: 2 },
  { w: 3, h: 2 },
  { w: 2, h: 3 },
  { w: 3, h: 3 },
  { w: 4, h: 4 },
  { w: 4, h: 8 },
  { w: 8, h: 4 },
  { w: 3, h: 8 },
  { w: 8, h: 3 },
  { w: 2, h: 8 },
  { w: 8, h: 2 },
  { w: 1, h: 8 },
  { w: 8, h: 1 },
];

export const MIN_BLOCKER_FRACTION = 0.5;

export interface PocketMaskResult {
  /** Column-major: `true` = bubble/blocker, `false` = gem pocket. */
  isBubble: boolean[][];
  width: number;
  height: number;
  pocket: { col: number; row: number; w: number; h: number };
}

function mirrorLeftHalf(isBubble: boolean[][], w: number, h: number): void {
  const half = Math.floor(w / 2);
  for (let c = 0; c < half; c++) {
    for (let r = 0; r < h; r++) {
      isBubble[w - 1 - c]![r] = isBubble[c]![r]!;
    }
  }
}

function countBubbles(isBubble: boolean[][], w: number, h: number): number {
  let n = 0;
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      if (isBubble[c]![r]) n++;
    }
  }
  return n;
}

export function shapesFittingLeftHalf(
  width: number,
  height: number,
): ReadonlyArray<{ w: number; h: number }> {
  const half = Math.floor(width / 2);
  return POCKET_DIMENSIONS.filter(
    ({ w, h }) => w <= half && h <= height && w >= 1 && h >= 1,
  );
}

/**
 * Build a left-right symmetric gem/bubble mask:
 * carve one rectangle in the left half, mirror across the vertical axis,
 * rest = bubbles. Rejects masks with solo gems or insufficient blocker fraction.
 */
export function buildPocketFirstMask(
  width: number,
  height: number,
  rng: SeededRNG,
  maxAttempts = 48,
  levelId = 0,
): PocketMaskResult | null {
  const half = Math.floor(width / 2);
  if (half < 1) return null;

  const shapes = shapesFittingLeftHalf(width, height);
  if (shapes.length === 0) return null;

  const totalCells = width * height;
  const maxLeftPocketArea = Math.floor(
    (totalCells * (1 - MIN_BLOCKER_FRACTION)) / 2,
  );

  // Rotate the shape list by levelId so consecutive levels start from
  // different shapes, guaranteeing different layouts even if the first
  // shape fails validation and we have to fall through.
  const shapeOffset = ((levelId - 1) % shapes.length + shapes.length) % shapes.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shapeIdx = (shapeOffset + attempt) % shapes.length;
    const shape = shapes[shapeIdx]!;
    const pw = shape.w;
    const ph = shape.h;
    if (pw * ph > maxLeftPocketArea) continue;

    const colMax = half - pw;
    const rowMax = height - ph;
    if (colMax < 0 || rowMax < 0) continue;

    // Position cycles by attempt too, seeded by rng for variance within a level.
    const col = colMax === 0 ? 0 : (rng.nextInt(0, colMax) + attempt) % (colMax + 1);
    const row = rowMax === 0 ? 0 : (rng.nextInt(0, rowMax) + attempt) % (rowMax + 1);

    const isBubble: boolean[][] = Array.from({ length: width }, () =>
      new Array(height).fill(true) as boolean[],
    );

    for (let c = col; c < col + pw; c++) {
      for (let r = row; r < row + ph; r++) {
        isBubble[c]![r] = false;
      }
    }

    mirrorLeftHalf(isBubble, width, height);

    if (countSoloGemCellsInMask(isBubble, width, height) > 0) continue;

    const bubbles = countBubbles(isBubble, width, height);
    const gemCells = totalCells - bubbles;
    if (gemCells < MIN_INITIAL_GEM_CELLS) continue;
    if (bubbles / totalCells < MIN_BLOCKER_FRACTION) continue;

    return { isBubble, width, height, pocket: { col, row, w: pw, h: ph } };
  }

  return null;
}
