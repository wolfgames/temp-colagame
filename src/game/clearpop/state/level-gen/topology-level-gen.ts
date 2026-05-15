/**
 * Topology-Aware Level Generator
 *
 * Default generator used by non-rect topologies (hex-down, radial-in). It
 * iterates `topology.cells`, paints blocks with a neighbour-bias so connected
 * pairs emerge naturally, and sprinkles a few obstacles for visual variety.
 *
 * The rect topology keeps its dedicated pipeline (`state/level-gen/index.ts`)
 * because the existing passes encode rect-specific aesthetics (mirror symmetry,
 * bottom blocker zones, pocket masks). This generic generator is intentionally
 * simpler — it satisfies the kernel invariants (at least one group of size ≥ 2,
 * every cell populated) without trying to reproduce the rect curve.
 */

import type { BoardState, BoardCell, BlockColor, ObstacleType } from '../types';
import { BLOCK_COLORS, OBSTACLE_MAX_HP } from '../types';
import { createSeededRNG } from '../seeded-rng';
import type { LevelGenConfig } from './types';
import type { Topology, CellId } from '../../contracts/topology';

/**
 * Fraction of cells converted to obstacles when the level config requests any
 * obstacle types. Capped to keep the board playable.
 */
const OBSTACLE_FRACTION = 0.15;
const MAX_OBSTACLE_FRACTION = 0.35;

export function generateTopologyLevel(
  config: LevelGenConfig,
  topology: Topology,
): BoardState {
  const rng = createSeededRNG(config.seed);
  const palette = BLOCK_COLORS.slice(0, Math.max(2, config.colorCount));
  const cellsById = new Map<CellId, BoardCell>();

  // Pass 1: paint every cell with a colour biased to match an already-painted
  // neighbour, so connected pairs emerge organically.
  for (const id of topology.cells) {
    let color: BlockColor | null = null;
    for (const neighborId of topology.neighbors(id)) {
      const existing = cellsById.get(neighborId);
      if (existing?.kind === 'block' && rng.next() < 0.55) {
        color = existing.color;
        break;
      }
    }
    cellsById.set(id, {
      kind: 'block',
      color: color ?? rng.pick(palette),
    });
  }

  // Pass 2: place obstacles. Stay below MAX_OBSTACLE_FRACTION so the board
  // always has enough free blocks to satisfy the validity gate.
  const obstacleTypes = config.obstacleTypes.length > 0
    ? config.obstacleTypes
    : (['marshmallow'] as ObstacleType[]);
  const targetObstacleCount = Math.floor(
    topology.cells.length * Math.min(OBSTACLE_FRACTION, MAX_OBSTACLE_FRACTION),
  );
  const obstacleIds = rng.shuffle([...topology.cells]).slice(0, targetObstacleCount);
  for (const id of obstacleIds) {
    const type = rng.pick(obstacleTypes);
    const existing = cellsById.get(id);
    const trappedBlock = existing?.kind === 'block'
      ? { kind: 'block' as const, color: existing.color }
      : undefined;
    cellsById.set(id, {
      kind: 'obstacle',
      obstacleType: type,
      hp: OBSTACLE_MAX_HP[type],
      ...(type === 'ice' || type === 'jelly' || type === 'cage' || type === 'cookie'
        ? { trappedBlock }
        : {}),
    });
  }

  // Pass 3: guarantee at least one valid group by forcing one cell to match
  // a neighbour. We grab the first cell with an obstacle-free neighbour and
  // copy that neighbour's colour onto it.
  ensureValidGroup(cellsById, topology, palette, rng);

  return {
    cellsById,
    cols: config.cols,
    rows: config.rows,
  };
}

function ensureValidGroup(
  cellsById: Map<CellId, BoardCell>,
  topology: Topology,
  palette: readonly BlockColor[],
  rng: ReturnType<typeof createSeededRNG>,
): void {
  // Already valid?
  for (const id of topology.cells) {
    const cell = cellsById.get(id);
    if (cell?.kind !== 'block') continue;
    for (const nId of topology.neighbors(id)) {
      const n = cellsById.get(nId);
      if (n?.kind === 'block' && n.color === cell.color) return;
    }
  }

  // Force a match between the first block and any block neighbour.
  for (const id of topology.cells) {
    const cell = cellsById.get(id);
    if (cell?.kind !== 'block') continue;
    for (const nId of topology.neighbors(id)) {
      const n = cellsById.get(nId);
      if (n?.kind === 'block') {
        const color = rng.pick(palette);
        cellsById.set(id, { kind: 'block', color });
        cellsById.set(nId, { kind: 'block', color });
        return;
      }
    }
  }
}
