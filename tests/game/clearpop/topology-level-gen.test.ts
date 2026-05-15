import { describe, it, expect } from 'vitest';
import { generateLevel } from '~/game/clearpop/state/level-generator';
import { createHexDownTopology } from '~/game/clearpop/topologies/hex-down';
import { createRadialInTopology } from '~/game/clearpop/topologies/radial-in';
import { hasValidGroups } from '~/game/clearpop/state/game-logic';
import { countObstacles } from '~/game/clearpop/state/board-state';

describe('generateLevel — topology-aware', () => {
  it('hex-down board populates with blocks, obstacles, and at least one valid group', () => {
    const topology = createHexDownTopology({ cols: 7, rows: 8 });
    const board = generateLevel(
      {
        levelId: 1,
        cols: 7,
        rows: 8,
        colorCount: 3,
        seed: 12345,
        obstacleTypes: ['marshmallow'],
      },
      topology,
    );

    // Every cell present
    expect(board.cellsById.size).toBe(topology.cells.length);
    for (const id of topology.cells) {
      const cell = board.cellsById.get(id);
      expect(cell, `cell ${id} should be populated`).toBeDefined();
      expect(cell!.kind === 'block' || cell!.kind === 'obstacle').toBe(true);
    }

    // At least one obstacle
    expect(countObstacles(board)).toBeGreaterThan(0);

    // At least one valid group (size ≥ 2 of same-colour neighbours)
    expect(hasValidGroups(board, topology)).toBe(true);
  });

  it('radial-in board populates with blocks, obstacles, and at least one valid group', () => {
    const topology = createRadialInTopology();
    const board = generateLevel(
      {
        levelId: 1,
        cols: 0,
        rows: 0,
        colorCount: 3,
        seed: 54321,
        obstacleTypes: ['marshmallow'],
      },
      topology,
    );

    expect(board.cellsById.size).toBe(topology.cells.length);
    for (const id of topology.cells) {
      expect(board.cellsById.get(id)).toBeDefined();
    }

    expect(countObstacles(board)).toBeGreaterThan(0);
    expect(hasValidGroups(board, topology)).toBe(true);
  });

  it('rect topology still routes through the existing pipeline', () => {
    // No topology arg → existing rect pipeline path
    const board = generateLevel({
      levelId: 1,
      cols: 8,
      rows: 8,
      colorCount: 3,
      seed: 99,
      obstacleTypes: ['marshmallow'],
    });
    expect(board.cellsById.size).toBeGreaterThan(0);
    expect(board.cols).toBe(8);
    expect(board.rows).toBe(8);
  });
});
