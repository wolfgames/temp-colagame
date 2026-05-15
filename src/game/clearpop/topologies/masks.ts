/**
 * Silhouette mask library — named shapes for topology cellMask predicates.
 *
 * Each function takes the topology's natural parameters and returns a
 * predicate `(cellId) => boolean`. Pass the predicate as `cellMask` when
 * constructing a topology to carve that shape out of the base lattice.
 *
 * v1 ships convex shapes only. Non-convex masks (horseshoe, pirate ship)
 * cause gravity to chain across visual gaps — pieces appear to fall
 * through voids. See per-topology cellMask docs for caveats.
 *
 * Usage:
 *   createRectOrthDownTopology({
 *     cols: 10, rows: 10,
 *     cellMask: rectMasks.deathStar(10, 10),
 *   });
 */
import type { CellId } from '../contracts/topology';
import { parseCellId } from './rect-orth-down';
import { parseHexCellId } from './hex-down';
import { parseRadialCellId } from './radial-in';

// ---------------------------------------------------------------------------
// Rect masks
// ---------------------------------------------------------------------------

export const rectMasks = {
  /**
   * Diamond / rhombus pointing up. Cells survive when |nx| + |ny| <= 1 in
   * normalized centered coords. Reads as a gem, a kite, a flag-banner.
   */
  diamond(cols: number, rows: number): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const nx = (col + 0.5) / cols * 2 - 1;
      const ny = (row + 0.5) / rows * 2 - 1;
      return Math.abs(nx) + Math.abs(ny) <= 1.05;
    };
  },

  /**
   * Plus / cross shape. Center column and center row survive at full
   * width / height. Reads as crosshair, hospital, plus, target reticle.
   */
  plus(cols: number, rows: number, thickness = 0.4): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const nx = (col + 0.5) / cols * 2 - 1;
      const ny = (row + 0.5) / rows * 2 - 1;
      return Math.abs(nx) <= thickness || Math.abs(ny) <= thickness;
    };
  },

  /**
   * Pyramid: apex at the top row, base at the bottom row. Width grows
   * linearly with depth. Reads as pyramid, mountain, triangle, ziggurat.
   */
  pyramid(cols: number, rows: number): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const cx = (cols - 1) / 2;
      const halfWidthAtRow = ((row + 1) / rows) * (cols / 2);
      return Math.abs(col - cx) <= halfWidthAtRow;
    };
  },

  /**
   * Heart. Uses the implicit cardioid curve (x²+y²−1)³ − x²·y³ ≤ 0 with
   * y inverted (rows go down). The lobes sit at the top.
   */
  heart(cols: number, rows: number): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const x = ((col + 0.5) / cols * 2 - 1) * 1.15;
      const y = -(((row + 0.5) / rows * 2 - 1)) * 1.15;
      const t = x * x + y * y - 1;
      return t * t * t - x * x * y * y * y <= 0;
    };
  },

  /**
   * Circle / disc inscribed in the bounding box.
   */
  circle(cols: number, rows: number): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const nx = (col + 0.5) / cols * 2 - 1;
      const ny = (row + 0.5) / rows * 2 - 1;
      return nx * nx + ny * ny <= 1.0;
    };
  },

  /**
   * Death Star: a disc with a circular notch carved out near the upper
   * right (the iconic superlaser dish). Convex-ish — gravity still works
   * because the notch is small and shallow.
   */
  deathStar(cols: number, rows: number): (id: CellId) => boolean {
    return (id) => {
      const { row, col } = parseCellId(id);
      const nx = (col + 0.5) / cols * 2 - 1;
      const ny = (row + 0.5) / rows * 2 - 1;
      const inDisc = nx * nx + ny * ny <= 1.0;
      if (!inDisc) return false;
      // Notch: small disc centered at (0.35, -0.35), radius 0.22.
      const dx = nx - 0.35;
      const dy = ny + 0.35;
      const inNotch = dx * dx + dy * dy <= 0.22 * 0.22;
      return !inNotch;
    };
  },
};

// ---------------------------------------------------------------------------
// Hex masks (axial coords)
// ---------------------------------------------------------------------------

export const hexMasks = {
  /**
   * Triangle: an equilateral triangle carved out of the hex. Keeps the
   * lower-right half (r >= 0). Reads as wedge, slice, pennant.
   */
  triangle(_radius: number): (id: CellId) => boolean {
    return (id) => {
      const { r } = parseHexCellId(id);
      return r >= 0;
    };
  },

  /**
   * Pyramid: apex at top of the hex (most-negative r), base at the
   * bottom. Width grows with depth.
   */
  pyramid(radius: number): (id: CellId) => boolean {
    return (id) => {
      const { q, r } = parseHexCellId(id);
      // depth = how far down from the top
      const depth = r + radius;
      const halfWidth = depth / 2;
      return Math.abs(q + r / 2) <= halfWidth;
    };
  },

  /**
   * Diamond (rotated square) inscribed in the hex.
   */
  diamond(radius: number): (id: CellId) => boolean {
    return (id) => {
      const { q, r } = parseHexCellId(id);
      return Math.abs(q) + Math.abs(r) <= radius;
    };
  },
};

// ---------------------------------------------------------------------------
// Radial masks (ring, idx)
// ---------------------------------------------------------------------------

export const radialMasks = {
  /**
   * Death Star on a radial topology: drop cells in a narrow angular
   * wedge on the right side of a middle ring, simulating the
   * superlaser dish carved into the sphere.
   */
  deathStar(ringSizes: number[]): (id: CellId) => boolean {
    const middleRing = Math.max(1, Math.floor(ringSizes.length / 2));
    return (id) => {
      const { ring, idx } = parseRadialCellId(id);
      if (ring !== middleRing) return true;
      const size = ringSizes[ring];
      const angle = (idx + 0.5) / size; // 0..1
      // Drop a wedge near angle 0 (right side). Wedge width ~12% of ring.
      return !(angle < 0.06 || angle > 0.94);
    };
  },

  /**
   * Half-disc: keep only the lower half (angle in 0..0.5 if we treat
   * angle 0 as right and going CCW; here we mask the upper half).
   */
  halfDisc(ringSizes: number[]): (id: CellId) => boolean {
    return (id) => {
      const { ring, idx } = parseRadialCellId(id);
      if (ring === 0) return true; // keep the center
      const size = ringSizes[ring];
      const angle = (idx + 0.5) / size;
      return angle <= 0.5;
    };
  },
};
