/**
 * rect-orth-down Topology
 *
 * The baseline ClearPop topology: a rectangular grid with 4-way orthogonal
 * neighbours and column-wise downward gravity. Spawn cells live on the top
 * row; refill paths are linear.
 *
 * Cell ids encode (row, col) as the string `${row},${col}` so they remain
 * human-readable in debug output. The topology is constructed for a given
 * board size; the runtime composes one per level once cols/rows are known.
 */

import type { CellId, LineAxis, Rect, Topology, Waypoint } from '../contracts/topology';

export function parseCellId(id: CellId): { row: number; col: number } {
  const comma = id.indexOf(',');
  return {
    row: Number(id.slice(0, comma)),
    col: Number(id.slice(comma + 1)),
  };
}

export function cellIdOf(row: number, col: number): CellId {
  return `${row},${col}`;
}

export interface RectOrthDownOptions {
  cols: number;
  rows: number;
  /** Optional tile + gap used by the default cellToScreen layout. */
  tileSize?: number;
  gap?: number;
  /**
   * Optional silhouette mask. When provided, only cells where the predicate
   * returns `true` exist in the topology. Voids are carved out: gravity
   * chains skip them, neighbours don't see them, line/area clears stop at
   * the silhouette boundary. The bounding box (cols × rows) is preserved so
   * the renderer keeps the same layout footprint.
   *
   * Convex masks are recommended for v1 — gravity for a non-convex shape
   * (e.g. horseshoe) treats each surviving segment as part of the same
   * column chain and pieces will appear to fall through the gap.
   */
  cellMask?: (cellId: CellId) => boolean;
}

/**
 * Build a Topology for a rectangular grid with the given dimensions. The
 * topology object is stateless; the runtime can cache one per (cols, rows)
 * pair if desired.
 */
export function createRectOrthDownTopology(opts: RectOrthDownOptions): Topology {
  const { cols, rows, cellMask } = opts;
  const masked = cellMask !== undefined;
  const inMask = (id: CellId) => !masked || cellMask(id);

  const cells: CellId[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = cellIdOf(r, c);
      if (inMask(id)) cells.push(id);
    }
  }

  const spawnCells: CellId[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const id = cellIdOf(r, c);
      if (inMask(id)) { spawnCells.push(id); break; }
    }
  }

  function neighbors(id: CellId): CellId[] {
    const { row, col } = parseCellId(id);
    const out: CellId[] = [];
    if (row > 0)        { const n = cellIdOf(row - 1, col); if (inMask(n)) out.push(n); }
    if (row < rows - 1) { const n = cellIdOf(row + 1, col); if (inMask(n)) out.push(n); }
    if (col > 0)        { const n = cellIdOf(row, col - 1); if (inMask(n)) out.push(n); }
    if (col < cols - 1) { const n = cellIdOf(row, col + 1); if (inMask(n)) out.push(n); }
    return out;
  }

  function gravityChains(): CellId[][] {
    const chains: CellId[][] = [];
    for (let c = 0; c < cols; c++) {
      const chain: CellId[] = [];
      for (let r = rows - 1; r >= 0; r--) {
        const id = cellIdOf(r, c);
        if (inMask(id)) chain.push(id);
      }
      if (chain.length > 0) chains.push(chain);
    }
    return chains;
  }

  function gravityOrder(): CellId[] {
    return gravityChains().flat();
  }

  function cellToScreen(id: CellId, viewport: Rect): { x: number; y: number } {
    const { row, col } = parseCellId(id);
    const tileSize = opts.tileSize ?? Math.floor(Math.min(viewport.width / cols, viewport.height / rows));
    const gap = opts.gap ?? 0;
    const step = tileSize + gap;
    const boardWidth = cols * step - gap;
    const boardHeight = rows * step - gap;
    const originX = viewport.x + (viewport.width - boardWidth) / 2 + tileSize / 2;
    const originY = viewport.y + (viewport.height - boardHeight) / 2 + tileSize / 2;
    return {
      x: originX + col * step,
      y: originY + row * step,
    };
  }

  function gravityPath(from: CellId, to: CellId, viewport: Rect): Waypoint[] {
    return [cellToScreen(from, viewport), cellToScreen(to, viewport)];
  }

  function refillEntryPath(spawn: CellId, target: CellId, viewport: Rect): Waypoint[] {
    const { col } = parseCellId(spawn);
    const start = cellToScreen(cellIdOf(0, col), viewport);
    const above: Waypoint = { x: start.x, y: viewport.y - 64 };
    return [above, cellToScreen(target, viewport)];
  }

  function lineThrough(id: CellId, axis: LineAxis): CellId[] {
    const { row, col } = parseCellId(id);
    const out: CellId[] = [];
    if (axis === 'primary') {
      for (let c = 0; c < cols; c++) {
        const cid = cellIdOf(row, c);
        if (inMask(cid)) out.push(cid);
      }
    } else {
      for (let r = 0; r < rows; r++) {
        const cid = cellIdOf(r, col);
        if (inMask(cid)) out.push(cid);
      }
    }
    return out;
  }

  function area(id: CellId, radius: number): CellId[] {
    const { row, col } = parseCellId(id);
    const out: CellId[] = [];
    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= rows) continue;
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= cols) continue;
        const cid = cellIdOf(r, c);
        if (inMask(cid)) out.push(cid);
      }
    }
    return out;
  }

  return {
    id: 'rect-orth-down',
    cells,
    neighbors,
    gravityOrder,
    gravityChains,
    spawnCells,
    cellToScreen,
    gravityPath,
    refillEntryPath,
    lineThrough,
    area,
    assetSpec: {
      pieceShape: 'square',
      pieceAspectRatio: 1,
      boardOutline: masked ? 'silhouette' : 'rect',
      frameStyle: 'rect',
    },
  };
}
