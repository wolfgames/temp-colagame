/**
 * ClearPop State Types
 *
 * Pure data types — no Pixi, no DOM, no side effects.
 * These define the shape of the game board and all cell variants.
 */

// ---------------------------------------------------------------------------
// Block Colors
// ---------------------------------------------------------------------------

export const BLOCK_COLORS = ['blue', 'red', 'yellow'] as const;
export type BlockColor = (typeof BLOCK_COLORS)[number];

/** Hex tint values applied to the neutral block sprite */
export const COLOR_TINTS: Record<BlockColor, number> = {
  blue:   0x9b7ed8,
  red:    0xf04840,
  yellow: 0xffee22,
};

// ---------------------------------------------------------------------------
// Obstacle Types
// ---------------------------------------------------------------------------

export type ObstacleType =
  | 'marshmallow'
  | 'egg'
  | 'ice'
  | 'jelly'
  | 'cage'
  | 'safe'
  | 'cookie';

export const OBSTACLE_MAX_HP: Record<ObstacleType, number> = {
  marshmallow: 1,
  egg: 2,
  ice: 3,
  jelly: 1,
  cage: 1,
  safe: 1,
  cookie: 3,
};

// ---------------------------------------------------------------------------
// Power-Up Types
// ---------------------------------------------------------------------------

export type PowerUpType = 'rocket' | 'bomb' | 'color_blast';

export type RocketDirection = 'up' | 'down' | 'left' | 'right';

export const POWERUP_THRESHOLDS: { minGroupSize: number; type: PowerUpType }[] = [
  { minGroupSize: 11, type: 'color_blast' },
  { minGroupSize: 7, type: 'bomb' },
  { minGroupSize: 5, type: 'rocket' },
];

// ---------------------------------------------------------------------------
// Cell Types
// ---------------------------------------------------------------------------

export interface BlockCell {
  kind: 'block';
  color: BlockColor;
}

export interface ObstacleCell {
  kind: 'obstacle';
  obstacleType: ObstacleType;
  hp: number;
  /** For ice/jelly/cage: the trapped block underneath (if any) */
  trappedBlock?: BlockCell;
  /** For safe: the obstacle hidden inside the box, revealed when the safe is opened. */
  trappedObstacle?: { obstacleType: ObstacleType; hp: number };
}

export interface PowerUpCell {
  kind: 'powerup';
  powerUpType: PowerUpType;
  color: BlockColor;
  rocketDirection?: RocketDirection;
}

export interface EmptyCell {
  kind: 'empty';
}

export type BoardCell = BlockCell | ObstacleCell | PowerUpCell | EmptyCell;

// ---------------------------------------------------------------------------
// Game Phase
// ---------------------------------------------------------------------------

export type GamePhase =
  | 'idle'
  | 'animating'
  | 'won'
  | 'lost';

// ---------------------------------------------------------------------------
// Board & Game State
// ---------------------------------------------------------------------------

/**
 * Board storage is keyed by topology CellId — supports rect, hex, radial
 * and any future topology without a 2-D-array assumption. `cols`/`rows`
 * remain for legacy rect callers; non-rect topologies set them to 0.
 */
export interface BoardState {
  cellsById: Map<import('../contracts/topology').CellId, BoardCell>;
  cols: number;
  rows: number;
}

export type GoalType = 'obstacle';

export interface LevelGoal {
  type: GoalType;
  target: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Bottom Blocker Zone
// ---------------------------------------------------------------------------

/**
 * A rectangular stamp of a single obstacle type placed within the blocker zone.
 * Coordinates are relative to the zone: row 0 = bottom-most zone row,
 * col 0 = left edge. Overlays are placed on the left half only —
 * mirrorSymmetryPass mirrors them to the right half automatically.
 */
export interface BlockerOverlay {
  type: ObstacleType;
  /** Row offset from the bottom of the zone (0 = bottom zone row). */
  rowOffset: number;
  rowCount: number;
  /** Col offset from the left edge (must fit within left half: col < cols/2). */
  colOffset: number;
  colCount: number;
}

/**
 * Declares that the bottom N rows of the board are pre-filled with
 * clearable obstacles in clean rectangular regions. Every cell in the
 * zone is an obstacle — no empties, no blocks.
 */
export interface BottomBlockerZoneConfig {
  /** Number of rows from the bottom to fill (max 6 on an 8-row board). */
  rows: number;
  /** Obstacle type that fills the entire zone before overlays are applied. */
  fill: ObstacleType;
  /** Optional rectangular stamps painted on top of the base fill. */
  overlays?: BlockerOverlay[];
}

export interface LevelConfig {
  levelId: number;
  cols: number;
  rows: number;
  colorCount: number;
  moves: number;
  starThresholds: [number, number, number];
  obstacleTypes: ObstacleType[];
  seed: number;
  goal: LevelGoal;
  /** When set, fills the bottom N rows with structured obstacle patterns. */
  bottomBlockerZone?: BottomBlockerZoneConfig;
}

export interface ClearPopState {
  board: BoardState;
  phase: GamePhase;
  score: number;
  movesRemaining: number;
  level: LevelConfig;
  starsEarned: number;
}

// ---------------------------------------------------------------------------
// Grid Coordinate
// ---------------------------------------------------------------------------

export interface GridPos {
  row: number;
  col: number;
}

// ---------------------------------------------------------------------------
// Gravity Movement Descriptor
// ---------------------------------------------------------------------------

export interface FallMovement {
  from: GridPos;
  to: GridPos;
  distance: number;
}

export interface RefillEntry {
  col: number;
  targetRow: number;
  color: BlockColor;
  dropDistance: number;
  /** Cell id the refilled piece lands at (any topology). */
  cellId: string;
  /** Cell id at the spawn / source of the refill chain (e.g. top of column
   *  for rect/hex, outer ring for radial). Animator splines through
   *  `topology.refillEntryPath(spawnId, cellId, viewport)`. */
  spawnId: string;
}
