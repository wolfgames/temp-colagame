import type { GameTuningBase } from '~/core/systems/tuning/types';

// ============================================
// GAME TUNING TYPES — ClearPop
// ============================================

export interface DevModeConfig {
  skipStartScreen: boolean;
}

export interface GameScreensConfig {
  startBackgroundColor: string;
  loadingBackgroundColor: string;
}

export interface BoardConfig {
  cols: number;
  rows: number;
  colorCount: number;
  gap: number;
}

export interface AnimationConfig {
  fallDurationPerCell: number;
  bounceDuration: number;
  popDuration: number;
  anticipationDuration: number;
}

export interface ScoringConfig {
  star1: number;
  star2: number;
  star3: number;
}

export interface GameTuning extends GameTuningBase {
  devMode: DevModeConfig;
  screens: GameScreensConfig;
  board: BoardConfig;
  animation: AnimationConfig;
  scoring: ScoringConfig;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const GAME_DEFAULTS: GameTuning = {
  version: '1.0.0',
  devMode: {
    skipStartScreen: false,
  },
  screens: {
    startBackgroundColor: '#1a1a2e',
    loadingBackgroundColor: '#1a1a2e',
  },
  board: {
    cols: 8,
    rows: 8,
    colorCount: 3,
    gap: 3,
  },
  animation: {
    fallDurationPerCell: 0.2,
    bounceDuration: 0.08,
    popDuration: 0.05,
    anticipationDuration: 0.03,
  },
  scoring: {
    star1: 0,
    star2: 4000,
    star3: 7000,
  },
};

// ============================================
// HELPERS
// ============================================

/** Parse theme from URL params — override in your game if needed */
export function getThemeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('theme') ?? null;
}
