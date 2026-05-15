import { describe, it, expect } from 'vitest';
import { generateLevel } from '~/game/clearpop/state/level-generator';
import { getLevelConfig } from '~/game/clearpop/state/level-configs';
import { findGroup, clearGroup, applyGravity, refillBoard } from '~/game/clearpop/state/game-logic';
import { createSeededRNG } from '~/game/clearpop/state/seeded-rng';
import type { BoardState } from '~/game/clearpop/state/types';

function findFirstTappableGroup(board: BoardState): { row: number; col: number }[] | null {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const group = findGroup(board, r, c);
      if (group.length >= 2) return group;
    }
  }
  return null;
}

describe('Gravity after clear', () => {
  it('gravity should produce movements or refills after clearing a non-bottom group for levels 1–20', () => {
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
      const rng = createSeededRNG(config.seed);

      const group = findFirstTappableGroup(board);
      expect(group, `Level ${lvl} has no tappable group`).not.toBeNull();
      if (!group) continue;

      const tapPos = group[0];
      const result = clearGroup(board, group, tapPos);

      const grav = applyGravity(result.board);
      const refill = refillBoard(grav.board, rng, config.colorCount);

      const totalActivity = grav.movements.length + refill.refills.length;
      expect(
        totalActivity,
        `Level ${lvl}: clearing ${group.length} blocks produced 0 movements and 0 refills`,
      ).toBeGreaterThan(0);
    }
  });

  it('generateLevel should never throw for levels 1–30', () => {
    for (let lvl = 1; lvl <= 30; lvl++) {
      const config = getLevelConfig(lvl);
      expect(() =>
        generateLevel({
          levelId: config.levelId,
          cols: config.cols,
          rows: config.rows,
          colorCount: config.colorCount,
          seed: config.seed,
          obstacleTypes: config.obstacleTypes,
        }),
      ).not.toThrow();
    }
  });
});
