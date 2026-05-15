/**
 * Power-Up Juice Helpers — stagger constants and spatial sort utilities.
 *
 * Used by the juice orchestrator to sequence particle bursts
 * outward from the detonation origin.
 */

import type { GridPos } from '../state/types';

export const ROCKET_STAGGER_MS = 42;
export const BOMB_STAGGER_MS = 42;
export const COLOR_BURST_STAGGER_MS = 52;

export function sortRocketLineOutward(
  positions: GridPos[],
  origin: GridPos,
  direction: 'up' | 'down' | 'left' | 'right',
): GridPos[] {
  const isHorizontal = direction === 'left' || direction === 'right';
  return [...positions].sort((a, b) => {
    const isOriginA = a.col === origin.col && a.row === origin.row;
    const isOriginB = b.col === origin.col && b.row === origin.row;
    if (isOriginA) return 1;
    if (isOriginB) return -1;

    const distA = isHorizontal
      ? Math.abs(a.col - origin.col)
      : Math.abs(a.row - origin.row);
    const distB = isHorizontal
      ? Math.abs(b.col - origin.col)
      : Math.abs(b.row - origin.row);
    return distA - distB;
  });
}

export function sortBombSquareOutward(
  positions: GridPos[],
  origin: GridPos,
): GridPos[] {
  return [...positions].sort((a, b) => {
    const ringA = Math.max(Math.abs(a.col - origin.col), Math.abs(a.row - origin.row));
    const ringB = Math.max(Math.abs(b.col - origin.col), Math.abs(b.row - origin.row));
    return ringA - ringB;
  });
}

/**
 * Reading-order sort: top-left first, scanning right across each row,
 * then down to the next row. This is what players expect from a
 * "sweep" effect like color burst.
 */
export function sortBurstReadingOrder(positions: GridPos[]): GridPos[] {
  return [...positions].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

export function maxBombRingDistance(
  positions: GridPos[],
  origin: GridPos,
): number {
  let max = 0;
  for (const pos of positions) {
    const ring = Math.max(Math.abs(pos.col - origin.col), Math.abs(pos.row - origin.row));
    if (ring > max) max = ring;
  }
  return max;
}
