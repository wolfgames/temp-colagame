/**
 * Game Logic — Pure Functions
 *
 * Core mechanics: group finding (flood fill), clearing, gravity, refill.
 * No Pixi, no DOM, no side effects. Uses SeededRNG for determinism.
 *
 * Control flow is topology-driven: `findGroup`/`applyGravity`/`refillBoard`
 * consult the active topology for neighbors, gravity chains and spawn cells
 * so the same kernel services rect, hex, radial, or any future topology.
 * Storage is `BoardState.cellsById: Map<CellId, BoardCell>`; rect topologies
 * use ids of the form `"row,col"`, so callers can move between (row,col) and
 * id via `posToCellId` / `cellIdToPos`.
 */

import type {
  BoardState,
  BoardCell,
  BlockColor,
  GridPos,
  FallMovement,
  RefillEntry,
  PowerUpType,
  RocketDirection,
} from './types';
import { BLOCK_COLORS, POWERUP_THRESHOLDS } from './types';
import {
  getCell,
  isPlayableBlock,
  cloneBoard,
  getCellById,
  setCellById,
  posToCellId,
  cellIdToPos,
} from './board-state';
import type { SeededRNG } from './seeded-rng';
import type { Topology, CellId } from '../contracts/topology';
import { createRectOrthDownTopology } from '../topologies/rect-orth-down';

/**
 * Default rect topology builder — used by callers (mostly tests) that
 * haven't been wired through with an explicit topology yet. Production
 * callers should construct their topology once per level and pass it in.
 */
export function rectTopologyForBoard(board: BoardState): Topology {
  return createRectOrthDownTopology({ cols: board.cols, rows: board.rows });
}

// ---------------------------------------------------------------------------
// Group Finding (BFS Flood Fill)
// ---------------------------------------------------------------------------

export function findGroup(
  board: BoardState,
  row: number,
  col: number,
  topology: Topology = rectTopologyForBoard(board),
): GridPos[] {
  // Look up via cellId so non-rect topologies (hex/radial) work — their
  // cell ids share the `"a,b"` format with rect, but their boards may have
  // `cols=0`/`rows=0`, which would fail rect-style bounds checks in getCell.
  const startId = posToCellId({ row, col });
  const startCell = getCellById(board, startId);
  if (!startCell || !isPlayableBlock(startCell)) return [];

  const targetColor = startCell.color;
  const visited = new Set<CellId>();
  const group: GridPos[] = [];
  const queue: CellId[] = [startId];

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const cell = getCellById(board, id);
    if (!cell || !isPlayableBlock(cell) || cell.color !== targetColor) continue;

    group.push(cellIdToPos(id));

    for (const neighborId of topology.neighbors(id)) {
      if (!visited.has(neighborId)) queue.push(neighborId);
    }
  }

  return group;
}

/**
 * Find every valid group on the board that meets the minimum size.
 * Used for highlighting valid moves.
 */
export function findAllGroups(
  board: BoardState,
  minGroupSize: number,
  topology: Topology = rectTopologyForBoard(board),
): GridPos[][] {
  const visited = new Set<CellId>();
  const groups: GridPos[][] = [];

  for (const id of topology.cells) {
    if (visited.has(id)) continue;

    const cell = getCellById(board, id);
    if (!cell || !isPlayableBlock(cell)) {
      visited.add(id);
      continue;
    }

    const pos = cellIdToPos(id);
    const group = findGroup(board, pos.row, pos.col, topology);
    for (const p of group) visited.add(posToCellId(p));
    if (group.length >= minGroupSize) groups.push(group);
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Clearing
// ---------------------------------------------------------------------------

/** Threshold: groups smaller than this spawn an obstacle instead of clearing cleanly.
 *  Groups of 2 leave behind a stone block. */

export interface ClearResult {
  board: BoardState;
  cleared: GridPos[];
  spawnedPowerUp: PowerUpType | null;
  spawnedRocketDirection: RocketDirection | null;
  spawnedObstacle: GridPos | null;
}

export function clearGroup(
  board: BoardState,
  group: GridPos[],
  tapPos: GridPos,
): ClearResult {
  const next = cloneBoard(board);
  const cleared: GridPos[] = [];

  for (const pos of group) {
    setCellById(next, posToCellId(pos), { kind: 'empty' });
    cleared.push(pos);
  }

  let spawnedPowerUp: PowerUpType | null = null;
  let spawnedRocketDirection: RocketDirection | null = null;
  let spawnedObstacle: GridPos | null = null;

  // Big clears may spawn a powerup; small clears no longer spawn a bubble.
  for (const threshold of POWERUP_THRESHOLDS) {
    if (group.length >= threshold.minGroupSize) {
      spawnedPowerUp = threshold.type;
      break;
    }
  }

  if (spawnedPowerUp) {
    const color = (getCell(board, tapPos.row, tapPos.col) as { color: BlockColor }).color;
    if (spawnedPowerUp === 'rocket') {
      spawnedRocketDirection = determineRocketDirection(group, tapPos);
    }
    setCellById(next, posToCellId(tapPos), {
      kind: 'powerup',
      powerUpType: spawnedPowerUp,
      color,
      ...(spawnedRocketDirection ? { rocketDirection: spawnedRocketDirection } : {}),
    });
  }

  return { board: next, cleared, spawnedPowerUp, spawnedRocketDirection, spawnedObstacle };
}

function determineRocketDirection(group: GridPos[], tapPos: GridPos): RocketDirection {
  // Compute group centroid
  let sumRow = 0, sumCol = 0;
  for (const p of group) {
    sumRow += p.row;
    sumCol += p.col;
  }
  const centroidRow = sumRow / group.length;
  const centroidCol = sumCol / group.length;

  // Direction from centroid toward tap position — rocket faces away from the group mass
  const dRow = tapPos.row - centroidRow;
  const dCol = tapPos.col - centroidCol;

  if (Math.abs(dCol) >= Math.abs(dRow)) {
    return dCol >= 0 ? 'right' : 'left';
  }
  return dRow >= 0 ? 'down' : 'up';
}

// ---------------------------------------------------------------------------
// Gravity
// ---------------------------------------------------------------------------

/**
 * Compact non-empty cells along each gravity chain toward the chain's sink
 * (chain[0]). Obstacles and explicitly anchored cells act as floors —
 * blocks above them stop falling there.
 */
export function applyGravity(
  board: BoardState,
  anchoredCells: GridPos[] = [],
  topology: Topology = rectTopologyForBoard(board),
): { board: BoardState; movements: FallMovement[] } {
  const next = cloneBoard(board);
  const movements: FallMovement[] = [];
  const anchored = new Set(anchoredCells.map(posToCellId));

  for (const chain of topology.gravityChains()) {
    let writeIdx = 0;

    for (let i = 0; i < chain.length; i++) {
      const cellId = chain[i];
      const cell = getCellById(next, cellId);
      if (!cell || cell.kind === 'empty') continue;

      if (cell.kind === 'obstacle' || anchored.has(cellId)) {
        // Obstacles/anchored cells stay put and reset the write index just
        // past their position so any blocks above them land on top.
        writeIdx = i + 1;
        continue;
      }

      if (i !== writeIdx) {
        const fromPos = cellIdToPos(cellId);
        const toPos = cellIdToPos(chain[writeIdx]);
        movements.push({
          from: fromPos,
          to: toPos,
          // For rect chains, distance is the row delta. For other topologies
          // the consumer should treat this as chain-distance.
          distance: Math.abs(toPos.row - fromPos.row),
        });
        setCellById(next, chain[writeIdx], cell);
        setCellById(next, cellId, { kind: 'empty' });
      }
      writeIdx++;
    }
  }

  return { board: next, movements };
}

// ---------------------------------------------------------------------------
// Refill
// ---------------------------------------------------------------------------

export function refillBoard(
  board: BoardState,
  rng: SeededRNG,
  colorCount: number,
  topology: Topology = rectTopologyForBoard(board),
): { board: BoardState; refills: RefillEntry[] } {
  const next = cloneBoard(board);
  const palette = BLOCK_COLORS.slice(0, colorCount);
  const refills: RefillEntry[] = [];

  for (const chain of topology.gravityChains()) {
    // Count empties in this chain so each refill knows how far it "fell".
    let emptyCount = 0;
    for (const id of chain) {
      if (getCellById(next, id)?.kind === 'empty') emptyCount++;
    }

    // Spawn cell for this chain: the source end (chain[chain.length - 1]),
    // i.e. the cell furthest from the sink. For rect/hex this is the top
    // of the column; for radial it is the outer-ring cell.
    const spawnId = chain[chain.length - 1] ?? chain[0];

    let fillIdx = 0;
    // Walk from sink (chain[0]) to source so the first refilled cell is
    // furthest from the spawn point and gets the largest drop distance —
    // matching the original column-wise top-down fill.
    for (let i = chain.length - 1; i >= 0; i--) {
      const id = chain[i];
      const current = getCellById(next, id);
      if (current?.kind !== 'empty') continue;
      const color = rng.pick(palette);
      setCellById(next, id, { kind: 'block', color });
      const pos = cellIdToPos(id);
      refills.push({
        col: pos.col,
        targetRow: pos.row,
        color,
        dropDistance: emptyCount - fillIdx,
        cellId: id,
        spawnId,
      });
      fillIdx++;
    }
  }

  return { board: next, refills };
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

export function hasValidGroups(
  board: BoardState,
  topology: Topology = rectTopologyForBoard(board),
): boolean {
  const visited = new Set<CellId>();
  for (const id of topology.cells) {
    if (visited.has(id)) continue;
    const pos = cellIdToPos(id);
    const group = findGroup(board, pos.row, pos.col, topology);
    for (const p of group) visited.add(posToCellId(p));
    if (group.length >= 2) return true;
  }
  return false;
}
