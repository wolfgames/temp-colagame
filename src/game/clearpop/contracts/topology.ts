/**
 * Topology Contract
 *
 * A topology declares the *shape* of a ClearPop playfield: cell set, neighbor
 * rule, gravity flow, spawn entries, and screen-positioning math. Pure data
 * plus small pure functions. No theming, no rendering, no logic.
 *
 * The mechanic kernel (flood-fill, gravity, refill, scoring) reads through
 * the Topology interface so a single implementation services rect, hex,
 * radial, or any future topology in the bounded library.
 */

/** Stable identifier for a single cell in a topology. */
export type CellId = string;

/** A screen-space point along an animation path. */
export interface Waypoint {
  x: number;
  y: number;
}

/** Rectangle in screen-space — usually the board's drawable bounds. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Asset-generation contract.
 *
 * Tells the asset generator what shape pieces tile in this topology so
 * generated sprites match the playfield geometry.
 */
export interface AssetSpec {
  pieceShape: 'square' | 'hex' | 'triangle' | 'circle';
  /** Aspect ratio for non-square pieces. 1.0 = square. */
  pieceAspectRatio: number;
  boardOutline: 'rect' | 'hex' | 'circle' | 'silhouette';
  frameStyle: 'rect' | 'hex' | 'circle';
}

/**
 * Two orthogonal "axes" along which 1-D line clears (rockets) sweep. Each
 * topology decides what these mean in its own coords:
 *   - Rect:   primary = row,    secondary = column.
 *   - Hex:    primary = E-W,    secondary = gravity chain (q-column).
 *   - Radial: primary = ring,   secondary = spoke (radial out from center).
 *
 * The mechanic kernel passes `'primary'` when the rocket's stored direction
 * is horizontal (`'left' | 'right'`) and `'secondary'` when vertical
 * (`'up' | 'down'`), so every topology supports both axes.
 */
export type LineAxis = 'primary' | 'secondary';

/**
 * Topology — the bounded library entry for one playfield shape.
 *
 * Default `gravityPath` / `refillEntryPath` implementations should return a
 * two-waypoint linear path. Exotic topologies override with curved or
 * multi-waypoint paths consumed by the animator.
 */
export interface Topology {
  id: string;

  /** All cells that exist in this topology. */
  cells: CellId[];

  /** Returns the neighbors of a cell — drives flood-fill. */
  neighbors(cell: CellId): CellId[];

  /** Iteration order for the gravity compaction sweep (flat). */
  gravityOrder(): CellId[];

  /**
   * Gravity is a set of independent 1-D chains: pieces compact along a chain
   * toward its first element (the sink). For rect-orth-down, each chain is
   * one column ordered bottom→top. For radial-in, each chain is one angular
   * spoke ordered innermost→outermost. The compaction algorithm iterates
   * each chain and packs non-empty cells toward the sink.
   */
  gravityChains(): CellId[][];

  /** Cells where new pieces enter on refill. */
  spawnCells: CellId[];

  /** Convert a cell id to its centre point in screen-space. */
  cellToScreen(cell: CellId, viewport: Rect): { x: number; y: number };

  /** Path a piece travels during a gravity move. Default = two-waypoint linear. */
  gravityPath(from: CellId, to: CellId, viewport: Rect): Waypoint[];

  /** Path a refilled piece travels from a spawn cell to its target. */
  refillEntryPath(spawn: CellId, target: CellId, viewport: Rect): Waypoint[];

  /**
   * 1-D line through `cell` along the given axis — drives rocket power-ups.
   * Includes `cell` itself. Ordering is topology-defined (e.g. left→right
   * for a rect row).
   */
  lineThrough(cell: CellId, axis: LineAxis): CellId[];

  /**
   * Cells within `radius` of `cell` — drives bomb power-ups and any future
   * radius-based mechanic. Includes `cell` itself. Topology decides the
   * shape (rect uses Chebyshev neighbourhood, hex/radial use BFS over
   * `neighbors`).
   */
  area(cell: CellId, radius: number): CellId[];

  assetSpec: AssetSpec;
}
