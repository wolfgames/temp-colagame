/**
 * Scoring Logic
 *
 * Pure functions — no side effects.
 * Formula from vision: Group Score = 10 * (groupSize ^ 1.5)
 */

export const COMBO_BONUS = 3000;

export function calcGroupScore(groupSize: number): number {
  if (groupSize < 2) return 0;
  return Math.round(10 * Math.pow(groupSize, 1.5));
}

export function calcStarsEarned(
  score: number,
  thresholds: [number, number, number],
): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
