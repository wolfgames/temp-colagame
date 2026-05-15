import { describe, it, expect } from 'vitest';
import { executeCombo, detonateBomb } from '~/game/clearpop/state/powerup-logic';
import type { BoardState, BoardCell } from '~/game/clearpop/state/types';
import { setCellById } from '~/game/clearpop/state/board-state';
import { cellIdOf } from '~/game/clearpop/topologies/rect-orth-down';

/** Build a small filled board with all blocks of color 'red'. */
function makeBoard(rows: number, cols: number): BoardState {
  const cellsById = new Map<string, BoardCell>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellsById.set(cellIdOf(r, c), { kind: 'block', color: 'red' });
    }
  }
  return { cellsById, rows, cols };
}

/** Place a rocket powerup on a board (mutates for test setup convenience). */
function placeRocket(
  board: BoardState,
  row: number,
  col: number,
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
): void {
  setCellById(board, cellIdOf(row, col), { kind: 'powerup', powerUpType: 'rocket', color: 'red', rocketDirection: direction });
}

/** Place an arbitrary cell on a board (mutates). */
function placeCell(board: BoardState, row: number, col: number, cell: BoardCell): void {
  setCellById(board, cellIdOf(row, col), cell);
}

/** Collect all cleared (empty) positions from a result board. */
function clearedPositions(result: BoardState): Set<string> {
  const s = new Set<string>();
  for (const [id, cell] of result.cellsById) {
    if (cell.kind === 'empty') s.add(id);
  }
  return s;
}

// ---------------------------------------------------------------------------
// detonateBomb
// ---------------------------------------------------------------------------

describe('detonateBomb', () => {
  it('clears exactly 8 surrounding cells (not the bomb itself) on a full board', () => {
    // 5×5 board, bomb at center (2,2). All other cells are blocks.
    const board = makeBoard(5, 5);
    placeCell(board, 2, 2, { kind: 'powerup', powerUpType: 'bomb', color: 'red' });

    const result = detonateBomb(board, 2, 2);

    // Bomb clears the 8 surrounding ring cells but NOT the bomb position itself
    expect(result.affectedCells.length).toBe(8);
    const keys = new Set(result.affectedCells.map((p) => `${p.row},${p.col}`));
    expect(keys.has('2,2'), 'bomb itself should not be in affectedCells').toBe(false);
  });

  it('all 8 ring positions are in affectedCells on a full board', () => {
    const board = makeBoard(5, 5);
    placeCell(board, 2, 2, { kind: 'powerup', powerUpType: 'bomb', color: 'red' });

    const result = detonateBomb(board, 2, 2);
    const keys = new Set(result.affectedCells.map((p) => `${p.row},${p.col}`));

    const expectedRing = [
      [1, 1], [1, 2], [1, 3],
      [2, 1],          [2, 3],
      [3, 1], [3, 2], [3, 3],
    ];
    for (const [r, c] of expectedRing) {
      expect(keys.has(`${r},${c}`), `(${r},${c}) should be in affectedCells`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// executeCombo — bomb_bomb
// ---------------------------------------------------------------------------

describe('executeCombo — bomb_bomb', () => {
  it('clears a 5×5 area (radius 2) centred on posA, not 9×9', () => {
    // 9×9 board, posA bomb at (4,4), posB bomb at (4,5) (adjacent).
    const board = makeBoard(9, 9);
    placeCell(board, 4, 4, { kind: 'powerup', powerUpType: 'bomb', color: 'red' });
    placeCell(board, 4, 5, { kind: 'powerup', powerUpType: 'bomb', color: 'blue' });

    const result = executeCombo(board, { row: 4, col: 4 }, { row: 4, col: 5 }, 'bomb_bomb');
    const cleared = clearedPositions(result.board);

    // Cells at radius > 2 from posA must NOT be cleared
    const shouldBeIntact = [
      [0, 0], [0, 4], [4, 0], [8, 8], [4, 8], [8, 4],
    ];
    for (const [r, c] of shouldBeIntact) {
      const dist = Math.max(Math.abs(r - 4), Math.abs(c - 4));
      if (dist > 2) {
        expect(cleared.has(`${r},${c}`), `(${r},${c}) at dist ${dist} should NOT be cleared`).toBe(false);
      }
    }

    // All cells within radius 2 of posA should be cleared
    for (let r = 4 - 2; r <= 4 + 2; r++) {
      for (let c = 4 - 2; c <= 4 + 2; c++) {
        expect(cleared.has(`${r},${c}`), `(${r},${c}) within radius 2 should be cleared`).toBe(true);
      }
    }
  });

  it('does not clear cells at radius 3 from posA', () => {
    const board = makeBoard(9, 9);
    placeCell(board, 4, 4, { kind: 'powerup', powerUpType: 'bomb', color: 'red' });
    placeCell(board, 4, 5, { kind: 'powerup', powerUpType: 'bomb', color: 'blue' });

    const result = executeCombo(board, { row: 4, col: 4 }, { row: 4, col: 5 }, 'bomb_bomb');
    const cleared = clearedPositions(result.board);

    // Sample of cells at radius 3 — must NOT be cleared
    expect(cleared.has('1,4'), '(1,4) at radius 3 should not be cleared').toBe(false);
    expect(cleared.has('7,4'), '(7,4) at radius 3 should not be cleared').toBe(false);
    expect(cleared.has('4,1'), '(4,1) at radius 3 should not be cleared').toBe(false);
    expect(cleared.has('4,7'), '(4,7) at radius 3 should not be cleared').toBe(false);
  });
});

// ---------------------------------------------------------------------------
// executeCombo — rocket_rocket
// ---------------------------------------------------------------------------

describe('executeCombo — rocket_rocket', () => {
  it('horizontal neighbors: clears shared row + posA column + posB column', () => {
    // 5×5 board. Two horizontal rockets at (2,1) posA and (2,3) posB.
    const board = makeBoard(5, 5);
    placeRocket(board, 2, 1, 'right');
    placeRocket(board, 2, 3, 'right');

    const result = executeCombo(board, { row: 2, col: 1 }, { row: 2, col: 3 }, 'rocket_rocket');
    const cleared = clearedPositions(result.board);

    // Entire row 2 must be cleared
    for (let c = 0; c < 5; c++) {
      expect(cleared.has(`2,${c}`), `row 2, col ${c} should be cleared`).toBe(true);
    }

    // posA's column (col 1) must be fully cleared
    for (let r = 0; r < 5; r++) {
      expect(cleared.has(`${r},1`), `col 1, row ${r} should be cleared (posA col)`).toBe(true);
    }

    // posB's column (col 3) must also be fully cleared
    for (let r = 0; r < 5; r++) {
      expect(cleared.has(`${r},3`), `col 3, row ${r} should be cleared (posB col)`).toBe(true);
    }
  });

  it('vertical neighbors: clears posA row + posB row + shared column', () => {
    // 5×5 board. Two vertical rockets at (1,2) posA and (3,2) posB.
    const board = makeBoard(5, 5);
    placeRocket(board, 1, 2, 'down');
    placeRocket(board, 3, 2, 'down');

    const result = executeCombo(board, { row: 1, col: 2 }, { row: 3, col: 2 }, 'rocket_rocket');
    const cleared = clearedPositions(result.board);

    // posA's row (row 1) must be fully cleared
    for (let c = 0; c < 5; c++) {
      expect(cleared.has(`1,${c}`), `row 1, col ${c} should be cleared (posA row)`).toBe(true);
    }

    // posB's row (row 3) must also be fully cleared
    for (let c = 0; c < 5; c++) {
      expect(cleared.has(`3,${c}`), `row 3, col ${c} should be cleared (posB row)`).toBe(true);
    }

    // Shared column (col 2) must be fully cleared
    for (let r = 0; r < 5; r++) {
      expect(cleared.has(`${r},2`), `col 2, row ${r} should be cleared (shared col)`).toBe(true);
    }
  });

  it('adjacent horizontal rockets: affectedCells includes cells from both columns', () => {
    // 5×5 board, rockets at (2,2) and (2,3) — directly adjacent.
    const board = makeBoard(5, 5);
    placeRocket(board, 2, 2, 'right');
    placeRocket(board, 2, 3, 'left');

    const result = executeCombo(board, { row: 2, col: 2 }, { row: 2, col: 3 }, 'rocket_rocket');
    const cleared = clearedPositions(result.board);

    // posA col (2) and posB col (3) both cleared
    for (let r = 0; r < 5; r++) {
      expect(cleared.has(`${r},2`), `col 2, row ${r} should be cleared`).toBe(true);
      expect(cleared.has(`${r},3`), `col 3, row ${r} should be cleared`).toBe(true);
    }
  });

  it('adjacent vertical rockets: affectedCells includes cells from both rows', () => {
    // 5×5 board, rockets at (2,2) and (3,2) — directly adjacent.
    const board = makeBoard(5, 5);
    placeRocket(board, 2, 2, 'down');
    placeRocket(board, 3, 2, 'up');

    const result = executeCombo(board, { row: 2, col: 2 }, { row: 3, col: 2 }, 'rocket_rocket');
    const cleared = clearedPositions(result.board);

    // posA row (2) and posB row (3) both cleared
    for (let c = 0; c < 5; c++) {
      expect(cleared.has(`2,${c}`), `row 2, col ${c} should be cleared`).toBe(true);
      expect(cleared.has(`3,${c}`), `row 3, col ${c} should be cleared`).toBe(true);
    }
  });
});
