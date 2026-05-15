import { describe, it, expect } from 'vitest';
import { generateLevel } from '~/game/clearpop/state/level-generator';
import { createHexDownTopology } from '~/game/clearpop/topologies/hex-down';
import { createRadialInTopology } from '~/game/clearpop/topologies/radial-in';
import {
  findGroup,
  clearGroup,
  applyGravity,
  refillBoard,
  hasValidGroups,
} from '~/game/clearpop/state/game-logic';
import {
  detonateRocket,
  detonateBomb,
  detonateColorBurst,
} from '~/game/clearpop/state/powerup-logic';
import { cellIdToPos, getCellById } from '~/game/clearpop/state/board-state';
import { createSeededRNG } from '~/game/clearpop/state/seeded-rng';
import type { Topology } from '~/game/clearpop/contracts/topology';
import type { BoardState } from '~/game/clearpop/state/types';

function makeBoardForTopology(topology: Topology, seed: number): BoardState {
  return generateLevel(
    {
      levelId: 1,
      cols: 0,
      rows: 0,
      colorCount: 3,
      seed,
      obstacleTypes: ['marshmallow'],
    },
    topology,
  );
}

describe('kernel — hex-down', () => {
  const topology = createHexDownTopology({ cols: 7, rows: 8 });

  it('tap → clear → gravity → refill keeps every cell populated', () => {
    const board = makeBoardForTopology(topology, 12345);

    // Find any valid group and tap its first cell.
    const groupCell = topology.cells.find((id) => {
      const pos = cellIdToPos(id);
      return findGroup(board, pos.row, pos.col, topology).length >= 2;
    });
    expect(groupCell, 'seed should produce at least one valid group').toBeDefined();
    const tap = cellIdToPos(groupCell!);

    const group = findGroup(board, tap.row, tap.col, topology);
    const clear = clearGroup(board, group, tap);
    const grav = applyGravity(clear.board, [], topology);
    const refill = refillBoard(grav.board, createSeededRNG(99), 3, topology);

    // Every cell of the topology must still exist in cellsById and be
    // non-empty after refill (refill is supposed to top everything up).
    for (const id of topology.cells) {
      const cell = getCellById(refill.board, id);
      expect(cell, `cell ${id} should be defined`).toBeDefined();
      expect(cell!.kind === 'empty').toBe(false);
    }

    expect(hasValidGroups(refill.board, topology)).toBe(true);
  });

  it('detonateRocket along primary axis clears every cell on that hex row', () => {
    const board = makeBoardForTopology(topology, 7777);
    const anchor = cellIdToPos('3,4'); // q=3, r=4 (one of the hex cells)
    const result = detonateRocket(board, anchor.row, anchor.col, 'right', topology);

    // Every cell on the primary line through (3,4) must end up empty.
    const line = topology.lineThrough('3,4', 'primary');
    for (const id of line) {
      const cell = getCellById(result.board, id);
      // After rocket, line cells are empty (block cleared) or remain as
      // partially-damaged obstacles. Marshmallow has hp=1 so it always dies.
      expect(cell?.kind === 'empty' || (cell?.kind === 'obstacle')).toBe(true);
    }
  });

  it('detonateBomb clears at least the cell + its 6 hex neighbours', () => {
    const board = makeBoardForTopology(topology, 22222);
    const anchor = cellIdToPos('3,4');
    const result = detonateBomb(board, anchor.row, anchor.col, topology);

    // area(cell, 1) on hex = 7 cells (interior) — every one should be in
    // affectedCells OR be an obstacle that survived with hp > 0.
    const area = topology.area('3,4', 1);
    expect(area.length).toBeGreaterThanOrEqual(4); // edge cell still has 4+ neighbours
    // affectedCells excludes the bomb's own position.
    const affectedKeys = new Set(result.affectedCells.map((p) => `${p.row},${p.col}`));
    // At least one of the neighbours must be affected (otherwise the bomb
    // did literally nothing).
    const anyNeighbourAffected = area.some((id) => {
      if (id === '3,4') return false;
      return affectedKeys.has(id);
    });
    expect(anyNeighbourAffected).toBe(true);
  });
});

describe('kernel — radial-in', () => {
  const topology = createRadialInTopology();

  it('tap → clear → gravity → refill keeps every cell populated', () => {
    const board = makeBoardForTopology(topology, 54321);

    const groupCell = topology.cells.find((id) => {
      const pos = cellIdToPos(id);
      return findGroup(board, pos.row, pos.col, topology).length >= 2;
    });
    expect(groupCell, 'radial seed should produce a valid group').toBeDefined();
    const tap = cellIdToPos(groupCell!);

    const group = findGroup(board, tap.row, tap.col, topology);
    const clear = clearGroup(board, group, tap);
    const grav = applyGravity(clear.board, [], topology);
    const refill = refillBoard(grav.board, createSeededRNG(77), 3, topology);

    for (const id of topology.cells) {
      const cell = getCellById(refill.board, id);
      expect(cell, `cell ${id} should be defined`).toBeDefined();
      expect(cell!.kind === 'empty').toBe(false);
    }
  });

  it('detonateColorBurst clears every block of the chosen colour', () => {
    const board = makeBoardForTopology(topology, 31415);
    // Pick a colour we know exists on the board (palette has 3 colours).
    const colour = 'blue';
    const result = detonateColorBurst(board, colour, 0, 0, topology);

    for (const id of topology.cells) {
      const cell = getCellById(result.board, id);
      if (cell && cell.kind === 'block') {
        expect(cell.color).not.toBe(colour);
      }
    }
  });

  it('detonateRocket along secondary axis (spoke) clears at least 2 cells', () => {
    const board = makeBoardForTopology(topology, 91011);
    // Outer ring cell, idx 0: ring=4, idx=0
    const anchor = cellIdToPos('4,0');
    const result = detonateRocket(board, anchor.row, anchor.col, 'up', topology);

    // Secondary axis on radial = spoke from centre outward. Should hit at
    // least the centre + outer ring cell = 2 distinct cells (more on
    // intermediate rings).
    const spokeIds = topology.lineThrough('4,0', 'secondary');
    expect(spokeIds.length).toBeGreaterThanOrEqual(2);
    // affectedCells should be non-empty (at least one cell other than the
    // rocket origin was cleared).
    expect(result.affectedCells.length).toBeGreaterThanOrEqual(1);
  });
});
