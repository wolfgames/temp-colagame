import { createSignal, createRoot } from 'solid-js';
import type { LevelConfig } from './clearpop/state/types';

/**
 * ClearPop game state that persists across screens.
 * Created in a root to avoid disposal issues.
 */

export interface GameState {
  score: () => number;
  setScore: (score: number) => void;
  addScore: (amount: number) => void;

  level: () => number;
  setLevel: (level: number) => void;
  incrementLevel: () => void;

  movesRemaining: () => number;
  setMovesRemaining: (moves: number) => void;
  decrementMoves: () => void;

  starsEarned: () => number;
  setStarsEarned: (stars: number) => void;

  blockerCount: () => number;
  setBlockerCount: (count: number) => void;

  currentLevelConfig: () => LevelConfig | null;
  setCurrentLevelConfig: (config: LevelConfig | null) => void;

  coins: () => number;
  setCoins: (coins: number) => void;
  addCoins: (amount: number) => void;

  lives: () => number;
  setLives: (lives: number) => void;

  reset: () => void;
}

function createGameState(): GameState {
  const [score, setScore] = createSignal(0);
  const [level, setLevel] = createSignal(1);
  const [movesRemaining, setMovesRemaining] = createSignal(30);
  const [starsEarned, setStarsEarned] = createSignal(0);
  const [blockerCount, setBlockerCount] = createSignal(0);
  const [currentLevelConfig, setCurrentLevelConfig] = createSignal<LevelConfig | null>(null);
  const [coins, setCoins] = createSignal(0);
  const [lives, setLives] = createSignal(5);

  return {
    score,
    setScore,
    addScore: (amount: number) => setScore((s) => s + amount),

    level,
    setLevel,
    incrementLevel: () => setLevel((l) => l + 1),

    movesRemaining,
    setMovesRemaining,
    decrementMoves: () => setMovesRemaining((m) => Math.max(0, m - 1)),

    starsEarned,
    setStarsEarned,

    blockerCount,
    setBlockerCount,

    currentLevelConfig,
    setCurrentLevelConfig,

    coins,
    setCoins,
    addCoins: (amount: number) => setCoins((c) => c + amount),

    lives,
    setLives,

    reset: () => {
      setScore(0);
      setLevel(1);
      setMovesRemaining(30);
      setStarsEarned(0);
      setBlockerCount(0);
      setCurrentLevelConfig(null);
    },
  };
}

export const gameState = createRoot(createGameState);
