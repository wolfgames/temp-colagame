import { describe, it, expect } from 'vitest';
import { generateLevel } from '~/game/clearpop/state/level-generator';
import { getLevelConfig } from '~/game/clearpop/state/level-configs';
import { findGroup, clearGroup, applyGravity, refillBoard } from '~/game/clearpop/state/game-logic';
import { createSeededRNG } from '~/game/clearpop/state/seeded-rng';
import type { BoardState } from '~/game/clearpop/state/types';
import { getCellById } from '~/game/clearpop/state/board-state';
import { cellIdOf } from '~/game/clearpop/topologies/rect-orth-down';

function countEmpty(board: BoardState): number {
  let count = 0;
  for (const cell of board.cellsById.values()) {
    if (cell.kind === 'empty') count++;
  }
  return count;
}

function findFirstTappableGroup(board: BoardState): { row: number; col: number }[] | null {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const group = findGroup(board, r, c);
      if (group.length >= 2) return group;
    }
  }
  return null;
}

describe('No empty cells invariant', () => {
  it('generated board for levels 1-20 should have zero empty cells', () => {
    for (let lvl = 1; lvl <= 20; lvl++) {
      const config = getLevelConfig(lvl);
      const board = generateLevel({
        levelId: config.levelId,
        cols: config.cols,
        rows: config.rows,
        colorCount: config.colorCount,
        seed: config.seed,
        obstacleTypes: config.obstacleTypes,
      });
      const empty = countEmpty(board);
      expect(empty, `Level ${lvl} has ${empty} empty cells`).toBe(0);
    }
  });

  it('board should have zero empty cells after clear→gravity→refill', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const config = getLevelConfig(lvl);
      let board = generateLevel({
        levelId: config.levelId,
        cols: config.cols,
        rows: config.rows,
        colorCount: config.colorCount,
        seed: config.seed,
        obstacleTypes: config.obstacleTypes,
      });
      const rng = createSeededRNG(config.seed);

      for (let tap = 0; tap < 5; tap++) {
        const group = findFirstTappableGroup(board);
        if (!group) break;

        const tapPos = group[0];
        const result = clearGroup(board, group, tapPos);
        board = result.board;

        const grav = applyGravity(board);
        board = grav.board;

        const refill = refillBoard(board, rng, config.colorCount);
        board = refill.board;

        const empty = countEmpty(board);
        expect(empty, `Level ${lvl} tap ${tap + 1}: ${empty} empty cells`).toBe(0);
      }
    }
  });

  it('every cell should be block or obstacle on initial board', () => {
    const config = getLevelConfig(1);
    const board = generateLevel({
      levelId: config.levelId,
      cols: config.cols,
      rows: config.rows,
      colorCount: config.colorCount,
      seed: config.seed,
      obstacleTypes: config.obstacleTypes,
    });

    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const cell = getCellById(board, cellIdOf(r, c));
        expect(
          cell !== null && (cell.kind === 'block' || cell.kind === 'obstacle'),
          `Cell [${r},${c}] is '${cell?.kind}' — expected block or obstacle`,
        ).toBe(true);
      }
    }
  });
});
