import type { BoardState, ObstacleType, BottomBlockerZoneConfig } from '../types';
import type { SeededRNG } from '../seeded-rng';

export type CellMask = 'bubble' | 'gem';

export interface LevelGenConfig {
  levelId: number;
  cols: number;
  rows: number;
  colorCount: number;
  seed: number;
  obstacleTypes: ObstacleType[];
  bottomBlockerZone?: BottomBlockerZoneConfig;
}

export interface LevelGenContext {
  config: LevelGenConfig;
  rng: SeededRNG;
  mask: CellMask[][] | null;
  board: BoardState;
  metadata: Map<string, unknown>;
}

/**
 * A single step in the level generation pipeline.
 * Returns the (possibly mutated) context, or `null` to reject and retry.
 */
export type LevelGenPass = (ctx: LevelGenContext) => LevelGenContext | null;
