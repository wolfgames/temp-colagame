import type { BoardState } from '../types';
import { createSeededRNG } from '../seeded-rng';
import { createEmptyBoard } from '../board-state';
import type { LevelGenConfig, LevelGenContext, LevelGenPass } from './types';

/**
 * Execute a list of passes in sequence, retrying with seed-bumped RNG
 * when any pass returns `null` (rejection).
 */
export function runPipeline(
  passes: LevelGenPass[],
  config: LevelGenConfig,
  maxAttempts: number,
): BoardState | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createSeededRNG(config.seed + attempt * 1337);
    let ctx: LevelGenContext | null = {
      config,
      rng,
      mask: null,
      board: createEmptyBoard(config.cols, config.rows),
      metadata: new Map(),
    };

    for (const pass of passes) {
      ctx = pass(ctx);
      if (!ctx) break;
    }

    if (ctx) return ctx.board;
  }
  return null;
}
