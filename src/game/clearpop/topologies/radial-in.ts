/**
 * radial-in Topology — concentric rings, gravity toward center.
 *
 * Cells live on a stack of rings. Cell id is `"ring,idx"` where `ring` is
 * 0..rings-1 (0 = innermost) and `idx` is 0..ringSize(ring)-1 going CCW
 * from angle 0.
 *
 * Default ring sizes are `[1, 6, 12, 18, 24]` (61 cells total). The
 * innermost ring is a single cell, connected angularly to itself (a no-op)
 * and radially outward to every cell of ring 1.
 *
 * Neighbours:
 *   • Angular: same ring, idx ± 1 (wrap mod ringSize).
 *   • Radial:  ring ± 1, idx mapped to the angularly-nearest cell in the
 *              other ring (since rings have different cell counts).
 *
 * Gravity: pieces fall toward the center along their angular spoke. A
 * "spoke" is one chain anchored at a cell of the innermost non-empty ring
 * and walking outward. Compaction packs outer cells inward.
 *
 * Refill enters from the outermost ring.
 */

import type { CellId, LineAxis, Rect, Topology, Waypoint } from '../contracts/topology';

export function radialCellId(ring: number, idx: number): CellId {
  return `${ring},${idx}`;
}

export function parseRadialCellId(id: CellId): { ring: number; idx: number } {
  const comma = id.indexOf(',');
  return {
    ring: Number(id.slice(0, comma)),
    idx: Number(id.slice(comma + 1)),
  };
}

export interface RadialInOptions {
  /** Cells per ring, innermost first. Default `[1, 6, 12, 18, 24]`. */
  ringSizes?: number[];
  /**
   * Optional silhouette mask. When provided, only cells where the predicate
   * returns `true` exist in the topology. The full ring layout (radial
   * extent) is preserved for sizing; the mask carves shapes inside it.
   * The innermost ring (ring 0) should remain a single cell — masking it
   * out is legal but breaks the "ring 1 connects to ring 0" topology
   * invariant. See RectOrthDownOptions.cellMask for caveats around
   * non-convex shapes.
   */
  cellMask?: (cellId: CellId) => boolean;
}

const DEFAULT_RING_SIZES = [1, 6, 12, 18, 24];

export function createRadialInTopology(opts: RadialInOptions = {}): Topology {
  const ringSizes = opts.ringSizes ?? DEFAULT_RING_SIZES;
  const rings = ringSizes.length;
  const outerRing = rings - 1;
  const cellMask = opts.cellMask;
  const masked = cellMask !== undefined;
  const inMask = (id: CellId) => !masked || cellMask(id);

  const cells: CellId[] = [];
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < ringSizes[r]; i++) {
      const id = radialCellId(r, i);
      if (inMask(id)) cells.push(id);
    }
  }

  // Spawn at the outermost surviving cell on each angular spoke. With no
  // mask this collapses to "every cell on the outer ring." With a mask,
  // some spokes may have spawn closer in.
  const spawnCells: CellId[] = [];
  for (let i = 0; i < ringSizes[outerRing]; i++) {
    // Walk outermost → inward and pick the first surviving cell.
    let added = false;
    for (let r = outerRing; r >= 0; r--) {
      const ringIdx = r === outerRing ? i : Math.floor(((i + 0.5) / ringSizes[outerRing]) * ringSizes[r]) % ringSizes[r];
      const id = radialCellId(r, ringIdx);
      if (inMask(id)) { spawnCells.push(id); added = true; break; }
    }
    void added;
  }

  /** Map an idx in ring `from` to the angularly-nearest idx in ring `to`. */
  function mapIdx(from: number, fromIdx: number, to: number): number {
    if (ringSizes[to] === 0) return 0;
    if (ringSizes[from] === 0) return 0;
    const angle = (fromIdx + 0.5) / ringSizes[from];
    return Math.floor(angle * ringSizes[to]) % ringSizes[to];
  }

  function neighbors(id: CellId): CellId[] {
    const { ring, idx } = parseRadialCellId(id);
    const out: CellId[] = [];
    const size = ringSizes[ring];
    const push = (cid: CellId) => { if (inMask(cid)) out.push(cid); };

    // Angular neighbours (skip when ring has fewer than 2 cells)
    if (size > 1) {
      push(radialCellId(ring, (idx + 1) % size));
      push(radialCellId(ring, (idx - 1 + size) % size));
    }

    // Radial inward — innermost ring (single cell) connects to all of ring 1.
    if (ring > 0) {
      if (ring === 1) {
        push(radialCellId(0, 0));
      } else {
        push(radialCellId(ring - 1, mapIdx(ring, idx, ring - 1)));
      }
    }

    // Radial outward
    if (ring < outerRing) {
      if (ring === 0) {
        for (let i = 0; i < ringSizes[1]; i++) push(radialCellId(1, i));
      } else {
        push(radialCellId(ring + 1, mapIdx(ring, idx, ring + 1)));
      }
    }

    return out;
  }

  /**
   * One chain per outer-ring cell: the chain walks inward toward the center
   * along the angular spoke. Inner rings get their cells visited from the
   * outermost spokes that map to them — duplicates are skipped so each cell
   * is processed exactly once.
   */
  function gravityChains(): CellId[][] {
    const chains: CellId[][] = [];
    const visited = new Set<CellId>();
    for (let i = 0; i < ringSizes[outerRing]; i++) {
      const chain: CellId[] = [];
      // Sink = innermost cell on this spoke; walk inward → outward.
      let idx = i;
      // First visit center if not yet
      const centerId = radialCellId(0, 0);
      if (!visited.has(centerId)) {
        if (inMask(centerId)) chain.push(centerId);
        visited.add(centerId);
      }
      // Walk outward from ring 1 to outerRing
      for (let r = 1; r <= outerRing; r++) {
        idx = mapIdx(outerRing, i, r);
        const id = radialCellId(r, idx);
        if (visited.has(id)) continue;
        visited.add(id);
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
    const { ring, idx } = parseRadialCellId(id);
    const maxR = Math.min(viewport.width, viewport.height) / 2;
    // Pick piece pitch P so the outer ring fits: R_out + P/2 = maxR,
    // where R_out = ringSizes[outer]·P/(2π). Ring radius is then driven by
    // the ring's cell count, so arc-per-piece collapses to P on every ring
    // and radial gap between rings also collapses to P.
    const outerSize = ringSizes[outerRing];
    const pitch = maxR / (outerSize / (2 * Math.PI) + 0.5);
    const size = ringSizes[ring];
    const radius = size <= 1 ? 0 : (size * pitch) / (2 * Math.PI);
    const angle = size > 0 ? ((idx + 0.5) / size) * Math.PI * 2 : 0;
    const cx = viewport.x + viewport.width  / 2;
    const cy = viewport.y + viewport.height / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function gravityPath(from: CellId, to: CellId, viewport: Rect): Waypoint[] {
    return [cellToScreen(from, viewport), cellToScreen(to, viewport)];
  }

  function refillEntryPath(spawn: CellId, target: CellId, viewport: Rect): Waypoint[] {
    // Refill enters from just outside the outer ring along the spawn's angle.
    const start = cellToScreen(spawn, viewport);
    const cx = viewport.x + viewport.width  / 2;
    const cy = viewport.y + viewport.height / 2;
    const dx = start.x - cx;
    const dy = start.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const overshoot = Math.min(viewport.width, viewport.height) * 0.1;
    const above: Waypoint = {
      x: start.x + (dx / len) * overshoot,
      y: start.y + (dy / len) * overshoot,
    };
    return [above, cellToScreen(target, viewport)];
  }

  /**
   * Radial rocket axes:
   *   - primary  → the ring through the cell (angular sweep, all idx).
   *   - secondary → the spoke through the cell (radial sweep, all rings).
   *
   * Spokes are computed by mapping the cell's angular position outward and
   * inward through `mapIdx`, so the line traces the same approximate angle
   * across rings of different sizes.
   */
  function lineThrough(id: CellId, axis: LineAxis): CellId[] {
    const { ring, idx } = parseRadialCellId(id);
    const out: CellId[] = [];
    if (axis === 'primary') {
      for (let i = 0; i < ringSizes[ring]; i++) {
        const cid = radialCellId(ring, i);
        if (inMask(cid)) out.push(cid);
      }
      return out;
    }
    // Secondary: spoke. Walk outward from ring 0, picking the angularly-
    // closest cell on each ring. Use the input cell's angle as the anchor.
    const centerId = radialCellId(0, 0);
    if (inMask(centerId)) out.push(centerId);
    for (let r = 1; r < rings; r++) {
      const mapped = mapIdx(ring, idx, r);
      const cid = radialCellId(r, mapped);
      if (inMask(cid)) out.push(cid);
    }
    return out;
  }

  /** BFS-over-neighbors area, same shape as hex. */
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
    id: 'radial-in',
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
      pieceShape: 'circle',
      pieceAspectRatio: 1,
      boardOutline: masked ? 'silhouette' : 'circle',
      frameStyle: 'circle',
    },
  };
}
