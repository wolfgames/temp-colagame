/**
 * Seeded Random Number Generator
 *
 * Mulberry32 — a fast 32-bit PRNG with good distribution.
 * Deterministic: same seed always produces the same sequence.
 * Used in game state (board generation, refills) instead of Math.random().
 */

export interface SeededRNG {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number;
  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T;
  /** Shuffle an array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[];
  /** Current internal state (for serialization/replay) */
  readonly state: number;
}

export function createSeededRNG(seed: number): SeededRNG {
  let s = seed | 0;

  function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[nextInt(0, arr.length - 1)];
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  return {
    next,
    nextInt,
    pick,
    shuffle,
    get state() { return s; },
  };
}
