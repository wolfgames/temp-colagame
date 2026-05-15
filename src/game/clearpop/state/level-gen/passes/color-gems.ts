/**
 * Pass 3: Fill empty (gem) cells with random colors.
 * Uses neighbor-biased coloring to seed playable clusters,
 * then caps oversized groups via flood-fill recoloring.
 */

import type { LevelGenContext } from '../types';
import type { BlockColor, BoardState } from '../../types';
import { BLOCK_COLORS, OBSTACLE_MAX_HP } from '../../types';
import { getCell, getCellById, setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';
import type { SeededRNG } from '../../seeded-rng';
import { floodFill } from '../util/flood-fill';

const MAX_GROUP_SIZE = 4;
/** Chance to copy an adjacent block's color instead of picking randomly */
const NEIGHBOR_BIAS = 0.35;

export function colorGemsPass(ctx: LevelGenContext): LevelGenContext | null {
  const { board, config, rng } = ctx;
  const palette = BLOCK_COLORS.slice(0, config.colorCount);

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (cell && cell.kind === 'empty') {
        const neighborColor = getNeighborBlockColor(board, r, c);
        const color = neighborColor && rng.next() < NEIGHBOR_BIAS
          ? neighborColor
          : rng.pick(palette);
        setCellById(board, cellIdOf(r, c), { kind: 'block', color });
      }
    }
  }

  enforceMaxGroupSize(board, palette, rng);
  enforcePairs(board, config.obstacleTypes.includes('marshmallow'));
  return ctx;
}

/**
 * Recolor any solo block to match a block neighbor.
 * Fallback for fully-isolated blocks: convert to marshmallow when allowed,
 * otherwise leave the block — validate-board will reject and retry if needed.
 */
export function enforcePairs(board: BoardState, bubblesAllowed: boolean = true): void {
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const cell = getCellById(board, cellIdOf(r, c));
      if (!cell || cell.kind !== 'block') continue;
      const group = floodFill(board, r, c, cell.color);
      if (group.length >= 2) continue;

      let matched = false;
      for (const [dr, dc] of DIRS) {
        const neighbor = getCell(board, r + dr, c + dc);
        if (neighbor?.kind === 'block') {
          setCellById(board, cellIdOf(r, c), { kind: 'block', color: neighbor.color });
          matched = true;
          break;
        }
      }

      if (!matched && bubblesAllowed) {
        setCellById(board, cellIdOf(r, c), { kind: 'obstacle', obstacleType: 'marshmallow', hp: OBSTACLE_MAX_HP.marshmallow });
      }
    }
  }
}

function getNeighborBlockColor(board: BoardState, r: number, c: number): BlockColor | null {
  for (const [dr, dc] of [[-1, 0], [0, -1]] as const) {
    const cell = getCell(board, r + dr, c + dc);
    if (cell && cell.kind === 'block') return cell.color;
  }
  return null;
}

function enforceMaxGroupSize(
  board: BoardState,
  palette: readonly BlockColor[],
  rng: SeededRNG,
): void {
  for (let attempt = 0; attempt < 60; attempt++) {
    let tooLarge = false;
    const visited = new Set<string>();

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const key = `${r},${c}`;
        if (visited.has(key)) continue;

        const cell = getCellById(board, cellIdOf(r, c));
        if (!cell || cell.kind !== 'block') { visited.add(key); continue; }

        const group = floodFill(board, r, c, cell.color);
        for (const p of group) visited.add(`${p.row},${p.col}`);

        if (group.length > MAX_GROUP_SIZE) {
          tooLarge = true;
          for (let i = MAX_GROUP_SIZE; i < group.length; i++) {
            const p = group[i]!;
            const otherColors = palette.filter((col) => col !== cell.color);
            setCellById(board, cellIdOf(p.row, p.col), {
              kind: 'block',
              color: rng.pick(otherColors),
            });
          }
        }
      }
    }

    if (!tooLarge) break;
  }
}
