import type { BoardState, BlockColor, GridPos } from '../../types';
import { getCell } from '../../board-state';

const ORTHOGONAL: readonly GridPos[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function floodFill(
  board: BoardState,
  startRow: number,
  startCol: number,
  color: BlockColor,
): GridPos[] {
  const visited = new Set<string>();
  const group: GridPos[] = [];
  const queue: GridPos[] = [{ row: startRow, col: startCol }];

  while (queue.length > 0) {
    const pos = queue.pop()!;
    const key = `${pos.row},${pos.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = getCell(board, pos.row, pos.col);
    if (!cell || cell.kind !== 'block' || cell.color !== color) continue;

    group.push(pos);

    for (const dir of ORTHOGONAL) {
      const nr = pos.row + dir.row;
      const nc = pos.col + dir.col;
      if (!visited.has(`${nr},${nc}`)) queue.push({ row: nr, col: nc });
    }
  }

  return group;
}

/** Count gem cells that have zero orthogonal gem neighbors in a mask grid. */
export function countSoloGemCellsInMask(
  isBubble: boolean[][],
  cols: number,
  rows: number,
): number {
  let n = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (isBubble[c]![r]) continue;
      let gemNeighbors = 0;
      for (const dir of ORTHOGONAL) {
        const nc = c + dir.col;
        const nr = r + dir.row;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (!isBubble[nc]![nr]) gemNeighbors++;
      }
      if (gemNeighbors === 0) n++;
    }
  }
  return n;
}

/** Count block cells with zero orthogonal block neighbors on a board. */
export function countSoloGemCellsOnBoard(board: BoardState): number {
  let n = 0;
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const here = getCell(board, r, c);
      if (!here || here.kind !== 'block') continue;
      let hasNeighbor = false;
      for (const dir of ORTHOGONAL) {
        const nr = r + dir.row;
        const nc = c + dir.col;
        const neighbor = getCell(board, nr, nc);
        if (neighbor && neighbor.kind === 'block') { hasNeighbor = true; break; }
      }
      if (!hasNeighbor) n++;
    }
  }
  return n;
}

/** BFS connected-component search on a boolean grid (true = target cells). */
export function largestConnectedComponent(
  grid: boolean[][],
  cols: number,
  rows: number,
): number {
  const visited = new Set<string>();
  let largest = 0;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const key = `${c},${r}`;
      if (visited.has(key) || !grid[c]?.[r]) continue;

      let size = 0;
      const queue: [number, number][] = [[c, r]];
      while (queue.length > 0) {
        const [qc, qr] = queue.pop()!;
        const qk = `${qc},${qr}`;
        if (visited.has(qk)) continue;
        visited.add(qk);
        if (!grid[qc]?.[qr]) continue;
        size++;
        for (const dir of ORTHOGONAL) {
          const nc = qc + dir.col;
          const nr = qr + dir.row;
          if (nc >= 0 && nr >= 0 && nc < cols && nr < rows && !visited.has(`${nc},${nr}`)) {
            queue.push([nc, nr]);
          }
        }
      }
      if (size > largest) largest = size;
    }
  }
  return largest;
}

/** Find all connected components and return their sizes. */
export function allComponentSizes(
  grid: boolean[][],
  cols: number,
  rows: number,
): number[] {
  const visited = new Set<string>();
  const sizes: number[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const key = `${c},${r}`;
      if (visited.has(key) || !grid[c]?.[r]) continue;

      let size = 0;
      const queue: [number, number][] = [[c, r]];
      while (queue.length > 0) {
        const [qc, qr] = queue.pop()!;
        const qk = `${qc},${qr}`;
        if (visited.has(qk)) continue;
        visited.add(qk);
        if (!grid[qc]?.[qr]) continue;
        size++;
        for (const dir of ORTHOGONAL) {
          const nc = qc + dir.col;
          const nr = qr + dir.row;
          if (nc >= 0 && nr >= 0 && nc < cols && nr < rows && !visited.has(`${nc},${nr}`)) {
            queue.push([nc, nr]);
          }
        }
      }
      sizes.push(size);
    }
  }
  return sizes;
}
