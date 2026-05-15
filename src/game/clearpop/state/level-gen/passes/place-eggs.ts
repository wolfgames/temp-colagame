/**
 * Pass 5: Place eggs using a rotating pattern strategy keyed by levelId.
 * Patterns include rows, cols, diagonals, corners, diamond, and cross so
 * consecutive egg-heavy levels look visually distinct.
 *
 * Prefers converting marshmallow cells; falls back to blocks when
 * marshmallow isn't active in the level.
 */

import type { LevelGenContext } from '../types';
import type { BoardState, GridPos } from '../../types';
import { createObstacle } from '../../obstacle-logic';
import { getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

type PatternFn = (board: BoardState) => GridPos[];

const EGG_PATTERNS: readonly PatternFn[] = [
  // 0: two horizontal stripes (upper + mid)
  (b) => rowPositions(b, [1, 3]),
  // 1: two vertical stripes (left + mid)
  (b) => colPositions(b, [1, 4]),
  // 2: diagonal bands
  (b) => diagonalPositions(b, /*slope*/ 1),
  // 3: anti-diagonal bands
  (b) => diagonalPositions(b, /*slope*/ -1),
  // 4: four corner 2x2 clusters
  (b) => cornerClusters(b, 2),
  // 5: center diamond
  (b) => diamondPositions(b),
  // 6: plus-cross through center
  (b) => crossPositions(b),
  // 7: checkerboard on a single quadrant
  (b) => checkerQuadrant(b),
  // 8: two horizontal stripes (lower band)
  (b) => rowPositions(b, [5, 7]),
  // 9: two vertical stripes (right + mid)
  (b) => colPositions(b, [3, 6]),
];

export function placeEggsPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config } = ctx;
  const pattern = EGG_PATTERNS[(config.levelId - 1) % EGG_PATTERNS.length]!;
  const targets = pattern(board);

  // Prefer converting existing marshmallows.
  let converted = 0;
  for (const { row, col } of targets) {
    const cell = getCellById(board, cellIdOf(row, col));
    if (cell?.kind === 'obstacle' && cell.obstacleType === 'marshmallow') {
      setCellById(board, cellIdOf(row, col), createObstacle('egg'));
      converted++;
    }
  }

  if (converted > 0) return ctx;

  // Fallback: convert block cells in the same pattern (trap the block underneath).
  for (const { row, col } of targets) {
    const cell = getCellById(board, cellIdOf(row, col));
    if (cell?.kind === 'block') {
      setCellById(board, cellIdOf(row, col), createObstacle('egg', { ...cell }));
    }
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Pattern helpers
// ---------------------------------------------------------------------------

function rowPositions(b: BoardState, rows: number[]): GridPos[] {
  const out: GridPos[] = [];
  for (const r of rows) {
    if (r < 0 || r >= b.rows) continue;
    for (let c = 0; c < b.cols; c++) out.push({ row: r, col: c });
  }
  return out;
}

function colPositions(b: BoardState, cols: number[]): GridPos[] {
  const out: GridPos[] = [];
  for (const c of cols) {
    if (c < 0 || c >= b.cols) continue;
    for (let r = 0; r < b.rows; r++) out.push({ row: r, col: c });
  }
  return out;
}

function diagonalPositions(b: BoardState, slope: 1 | -1): GridPos[] {
  const out: GridPos[] = [];
  for (let r = 0; r < b.rows; r++) {
    const c = slope === 1 ? r : b.cols - 1 - r;
    if (c >= 0 && c < b.cols) out.push({ row: r, col: c });
    const c2 = c + 1;
    if (c2 >= 0 && c2 < b.cols) out.push({ row: r, col: c2 });
  }
  return out;
}

function cornerClusters(b: BoardState, size: number): GridPos[] {
  const out: GridPos[] = [];
  const corners: [number, number][] = [
    [0, 0],
    [0, b.cols - size],
    [b.rows - size, 0],
    [b.rows - size, b.cols - size],
  ];
  for (const [r0, c0] of corners) {
    for (let dr = 0; dr < size; dr++) {
      for (let dc = 0; dc < size; dc++) {
        out.push({ row: r0 + dr, col: c0 + dc });
      }
    }
  }
  return out;
}

function diamondPositions(b: BoardState): GridPos[] {
  const cr = (b.rows - 1) / 2;
  const cc = (b.cols - 1) / 2;
  const radius = Math.min(b.rows, b.cols) / 2 - 1;
  const out: GridPos[] = [];
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const d = Math.abs(r - cr) + Math.abs(c - cc);
      if (d >= radius - 0.5 && d <= radius + 0.5) out.push({ row: r, col: c });
    }
  }
  return out;
}

function crossPositions(b: BoardState): GridPos[] {
  const cr = Math.floor(b.rows / 2);
  const cc = Math.floor(b.cols / 2);
  const out: GridPos[] = [];
  for (let c = 0; c < b.cols; c++) {
    out.push({ row: cr, col: c });
    out.push({ row: cr - 1, col: c });
  }
  for (let r = 0; r < b.rows; r++) {
    out.push({ row: r, col: cc });
    out.push({ row: r, col: cc - 1 });
  }
  return out;
}

function checkerQuadrant(b: BoardState): GridPos[] {
  const out: GridPos[] = [];
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      if (((r + c) & 1) === 0 && r < b.rows / 2) out.push({ row: r, col: c });
      if (((r + c) & 1) === 1 && r >= b.rows / 2) out.push({ row: r, col: c });
    }
  }
  return out;
}
