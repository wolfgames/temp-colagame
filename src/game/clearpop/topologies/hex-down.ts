/**
 * hex-down Topology — pointy-top hex grid, axial coordinates, hexagonal board.
 *
 * Cells use axial (q, r) with the origin at the centre of the board. The board
 * is a regular hexagon of axial radius `N`: every cell where
 * `max(|q|, |r|, |q+r|) ≤ N` is included. Cell id encodes `"q,r"`.
 *
 * Neighbours follow the six pointy-top directions:
 *   E  ( q+1, r   )
 *   W  ( q-1, r   )
 *   NE ( q+1, r-1 )
 *   NW ( q,   r-1 )
 *   SE ( q,   r+1 )
 *   SW ( q-1, r+1 )
 *
 * Gravity packs along each q-column toward its largest in-bounds r (the sink).
 * Spawn cells sit at each column's smallest in-bounds r (the top boundary of
 * the hexagon).
 */

import type { CellId, LineAxis, Rect, Topology, Waypoint } from '../contracts/topology';

const SQRT3 = Math.sqrt(3);

export function hexCellId(q: number, r: number): CellId {
  return `${q},${r}`;
}

export function parseHexCellId(id: CellId): { q: number; r: number } {
  const comma = id.indexOf(',');
  return {
    q: Number(id.slice(0, comma)),
    r: Number(id.slice(comma + 1)),
  };
}

export interface HexDownOptions {
  /** Axial radius of the hex board. radius=4 → 61 cells. Default 4. */
  radius?: number;
  /** Center-to-vertex pixel radius per hex (set after viewport sizing). */
  hexRadius?: number;
  /**
   * Optional silhouette mask. When provided, only cells where the predicate
   * returns `true` exist in the topology. The hex bounding hexagon
   * (radius N) is preserved for layout sizing; the mask carves shapes
   * inside it. See RectOrthDownOptions.cellMask for caveats around
   * non-convex shapes.
   */
  cellMask?: (cellId: CellId) => boolean;
}

/** Column q's r-range inside a hex of axial radius N. */
function rRangeForColumn(q: number, N: number): { rMin: number; rMax: number } {
  return {
    rMin: Math.max(-N, -q - N),
    rMax: Math.min( N,  N - q),
  };
}

export function createHexDownTopology(opts: HexDownOptions = {}): Topology {
  const N = opts.radius ?? 4;
  const cellMask = opts.cellMask;
  const masked = cellMask !== undefined;
  const inMask = (id: CellId) => !masked || cellMask(id);

  const cells: CellId[] = [];
  for (let q = -N; q <= N; q++) {
    const { rMin, rMax } = rRangeForColumn(q, N);
    for (let r = rMin; r <= rMax; r++) {
      const id = hexCellId(q, r);
      if (inMask(id)) cells.push(id);
    }
  }

  const spawnCells: CellId[] = [];
  for (let q = -N; q <= N; q++) {
    const { rMin, rMax } = rRangeForColumn(q, N);
    for (let r = rMin; r <= rMax; r++) {
      const id = hexCellId(q, r);
      if (inMask(id)) { spawnCells.push(id); break; }
    }
  }

  function inBounds(q: number, r: number): boolean {
    return Math.abs(q) <= N && Math.abs(r) <= N && Math.abs(q + r) <= N;
  }

  function neighbors(id: CellId): CellId[] {
    const { q, r } = parseHexCellId(id);
    const out: CellId[] = [];
    const deltas: Array<[number, number]> = [
      [+1,  0], // E
      [-1,  0], // W
      [+1, -1], // NE
      [ 0, -1], // NW
      [ 0, +1], // SE
      [-1, +1], // SW
    ];
    for (const [dq, dr] of deltas) {
      const nq = q + dq;
      const nr = r + dr;
      if (!inBounds(nq, nr)) continue;
      const nid = hexCellId(nq, nr);
      if (inMask(nid)) out.push(nid);
    }
    return out;
  }

  function gravityChains(): CellId[][] {
    const chains: CellId[][] = [];
    for (let q = -N; q <= N; q++) {
      const { rMin, rMax } = rRangeForColumn(q, N);
      const chain: CellId[] = [];
      // chain[0] = sink (bottom of column, largest in-bounds r)
      for (let r = rMax; r >= rMin; r--) {
        const id = hexCellId(q, r);
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
    const { q, r } = parseHexCellId(id);
    // Hex board extent: leftmost / rightmost cell centres sit at q=±N, r=0
    // → x = ±SQRT3·radius·N. y range is r ∈ [-N, N] → 1.5·radius·N each side.
    // Add one radius on each side for cell extents (point top/bottom).
    const widthInHexes  = 2 * N + 1;
    const heightInHalfs = 3 * N + 2; // in units of radius
    const pieceRadius = opts.hexRadius ?? Math.floor(Math.min(
      viewport.width  / (SQRT3 * widthInHexes),
      viewport.height / heightInHalfs,
    ));
    const px = SQRT3 * pieceRadius * (q + r / 2);
    const py = 1.5   * pieceRadius * r;
    const cx = viewport.x + viewport.width  / 2;
    const cy = viewport.y + viewport.height / 2;
    return { x: cx + px, y: cy + py };
  }

  function gravityPath(from: CellId, to: CellId, viewport: Rect): Waypoint[] {
    return [cellToScreen(from, viewport), cellToScreen(to, viewport)];
  }

  function refillEntryPath(spawn: CellId, target: CellId, viewport: Rect): Waypoint[] {
    const start = cellToScreen(spawn, viewport);
    const above: Waypoint = { x: start.x, y: viewport.y - 64 };
    return [above, cellToScreen(target, viewport)];
  }

  /**
   * Rocket axes for hex. `primary` is the E-W line (constant r). `secondary`
   * is the gravity chain (constant q).
   */
  function lineThrough(id: CellId, axis: LineAxis): CellId[] {
    const { q, r } = parseHexCellId(id);
    const out: CellId[] = [];
    if (axis === 'primary') {
      for (let qq = -N; qq <= N; qq++) {
        if (!inBounds(qq, r)) continue;
        const cid = hexCellId(qq, r);
        if (inMask(cid)) out.push(cid);
      }
    } else {
      for (let rr = -N; rr <= N; rr++) {
        if (!inBounds(q, rr)) continue;
        const cid = hexCellId(q, rr);
        if (inMask(cid)) out.push(cid);
      }
    }
    return out;
  }

  /**
   * BFS-over-neighbors area. For radius 1 returns 7 cells on the interior
   * (cell + 6 neighbors), fewer near edges. Matches the "bomb blast feels
   * like a hex flower" intuition.
   */
  function area(id: CellId, radius: number): CellId[] {
    const visited = new Set<CellId>([id]);
    const out: CellId[] = [id];
    let frontier: CellId[] = [id];
    for (let depth = 0; depth < radius; depth++) {
      const next: CellId[] = [];
      for (const cellId of frontier) {
        for (const nId of neighbors(cellId)) {
          if (visited.has(nId)) continue;
          visited.add(nId);
          next.push(nId);
          out.push(nId);
        }
      }
      frontier = next;
    }
    return out;
  }

  return {
    id: 'hex-down',
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
      pieceShape: 'hex',
      pieceAspectRatio: SQRT3 / 2,
      boardOutline: masked ? 'silhouette' : 'hex',
      frameStyle: 'hex',
    },
  };
}
