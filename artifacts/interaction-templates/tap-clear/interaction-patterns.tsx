/**
 * Tap-Clear Interaction Archetype — Logic Patterns
 *
 * This file contains the definitive patterns for tap-to-clear interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                 │
 * │ LOCKED — do not change values, logic, or structure:             │
 * │   - MIN_GROUP_SIZE (2)                                          │
 * │   - findGroup() — BFS, 4-directional, visited set              │
 * │   - applyGravity() — column-major, bottom-up, obstacle-aware   │
 * │   - calcGroupScore() — 10 × groupSize^1.5                      │
 * │   - POWERUP_THRESHOLDS — 5/7/9 → rocket/bomb/color_burst      │
 * │   - determineRocketDirection() — bounding box aspect ratio      │
 * │   - All animation timing values                                │
 * │                                                                 │
 * │ ADAPTABLE — change only where marked // ADAPT:                  │
 * │   - Type names (use your game's Block, Board, Color types)      │
 * │   - Renderer calls (PixiJS, React DOM, Canvas)                 │
 * │   - Board dimensions (ROWS, COLS, TILE_SIZE, GAP)              │
 * │   - Color palette and gradient key names                        │
 * │   - Obstacle types                                              │
 * │                                                                 │
 * │ If you find an improvement, do NOT apply it in the game.        │
 * │ Note it for archetype evolution instead.                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent — copy what you need.
 */

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const TILE_SIZE = 60;  // ADAPT: match your tile size
const GAP = 4;         // ADAPT: match your grid gap
const STRIDE = TILE_SIZE + GAP;
const ROWS = 8;        // ADAPT: match your board dimensions
const COLS = 8;        // ADAPT: match your board dimensions
const MIN_GROUP_SIZE = 2; // minimum connected blocks to clear

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1b: BLOCK VISUAL STYLE (LOCKED)
 *
 * Blocks are colored rounded rectangles with radial gradients.
 * Do NOT use circles, hexagons, diamonds, stars, emoji, or SVG shapes.
 * Color alone distinguishes blocks — shape is always the same.
 * Blocks fill 100% of their cell — spacing comes from GAP, not shrinking.
 * Do NOT use width/height < 100% or clipPath on block elements.
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: key names to match your BlockColor type, but keep the gradient values
const BLOCK_GRADIENTS: Record<string, string> = {
  red:    "radial-gradient(circle at 35% 35%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)",
  blue:   "radial-gradient(circle at 35% 35%, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)",
  green:  "radial-gradient(circle at 35% 35%, #86efac 0%, #22c55e 50%, #15803d 100%)",
  yellow: "radial-gradient(circle at 35% 35%, #fde68a 0%, #eab308 50%, #a16207 100%)",
  purple: "radial-gradient(circle at 35% 35%, #d8b4fe 0%, #a855f7 50%, #7e22ce 100%)",
};

const BLOCK_STYLE_BASE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3)",
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: replace with your game's types
type BlockColor = string;

interface GridPos {
  row: number;
  col: number;
}

interface Cell {
  kind: "block" | "powerup" | "obstacle" | "empty";
  color?: BlockColor;
  powerUpType?: PowerUpType;
}

type PowerUpType = "rocket" | "bomb" | "color_burst";

interface BoardState {
  rows: number;
  cols: number;
  cells: Cell[][];
}

interface FallMovement {
  from: GridPos;
  to: GridPos;
  distance: number;
}

interface RefillEntry {
  col: number;
  targetRow: number;
  color: BlockColor;
  dropDistance: number;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: GROUP DETECTION (BFS Flood-Fill)
 *
 * Pure function — no adaptation needed. Use as-is.
 * ═══════════════════════════════════════════════════════════════════════ */

const ORTHOGONAL: GridPos[] = [
  { row: -1, col: 0 },  // UP
  { row: 1, col: 0 },   // DOWN
  { row: 0, col: -1 },  // LEFT
  { row: 0, col: 1 },   // RIGHT
];

function getCell(board: BoardState, row: number, col: number): Cell | null {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) return null;
  return board.cells[row][col];
}

function findGroup(board: BoardState, row: number, col: number): GridPos[] {
  const cell = getCell(board, row, col);
  if (!cell || cell.kind !== "block") return [];

  const targetColor = cell.color;
  const visited = new Set<string>();
  const group: GridPos[] = [];
  const queue: GridPos[] = [{ row, col }];

  while (queue.length > 0) {
    const pos = queue.pop()!;
    const key = `${pos.row},${pos.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const c = getCell(board, pos.row, pos.col);
    if (!c || c.kind !== "block" || c.color !== targetColor) continue;

    group.push(pos);

    for (const dir of ORTHOGONAL) {
      const nr = pos.row + dir.row;
      const nc = pos.col + dir.col;
      if (!visited.has(`${nr},${nc}`)) {
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return group;
}

/**
 * Find ALL valid groups on the board (for highlight pulse).
 * Returns array of groups, each group is an array of positions.
 */
function findAllGroups(
  board: BoardState,
  minSize: number = MIN_GROUP_SIZE,
): GridPos[][] {
  const visited = new Set<string>();
  const groups: GridPos[][] = [];

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const key = `${r},${c}`;
      if (visited.has(key)) continue;

      const group = findGroup(board, r, c);
      if (group.length >= minSize) {
        groups.push(group);
        for (const pos of group) {
          visited.add(`${pos.row},${pos.col}`);
        }
      } else {
        visited.add(key);
      }
    }
  }

  return groups;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: SCORING
 *
 * Pure function — no adaptation needed. Use as-is.
 * ═══════════════════════════════════════════════════════════════════════ */

const COMBO_BONUS = 3000;

function calcGroupScore(groupSize: number): number {
  if (groupSize < MIN_GROUP_SIZE) return 0;
  return Math.round(10 * Math.pow(groupSize, 1.5));
}

// Score examples:
// 2 blocks →  28 pts
// 3 blocks →  52 pts
// 5 blocks → 112 pts
// 7 blocks → 185 pts
// 9 blocks → 270 pts

function calcStarsEarned(
  score: number,
  thresholds: [number, number, number], // ADAPT: your star thresholds
): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: POWER-UP THRESHOLDS
 *
 * Thresholds are LOCKED. The array is ordered highest-first so the
 * first match wins (largest group gets the best power-up).
 * ═══════════════════════════════════════════════════════════════════════ */

const POWERUP_THRESHOLDS: { minGroupSize: number; type: PowerUpType }[] = [
  { minGroupSize: 9, type: "color_burst" },
  { minGroupSize: 7, type: "bomb" },
  { minGroupSize: 5, type: "rocket" },
];

function determinePowerUp(groupSize: number): PowerUpType | null {
  for (const threshold of POWERUP_THRESHOLDS) {
    if (groupSize >= threshold.minGroupSize) {
      return threshold.type;
    }
  }
  return null;
}

/**
 * Rocket direction: determined by bounding box of the cleared group.
 * Width >= height → horizontal, otherwise vertical.
 */
function determineRocketDirection(
  group: GridPos[],
): "horizontal" | "vertical" {
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;
  for (const p of group) {
    if (p.row < minRow) minRow = p.row;
    if (p.row > maxRow) maxRow = p.row;
    if (p.col < minCol) minCol = p.col;
    if (p.col > maxCol) maxCol = p.col;
  }
  return (maxCol - minCol) >= (maxRow - minRow) ? "horizontal" : "vertical";
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: GRAVITY
 *
 * Column-major, bottom-up scan. Obstacles act as floors.
 * Pure function — no adaptation needed.
 * ═══════════════════════════════════════════════════════════════════════ */

function cloneBoard(board: BoardState): BoardState {
  return {
    rows: board.rows,
    cols: board.cols,
    cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

function applyGravity(
  board: BoardState,
): { board: BoardState; movements: FallMovement[] } {
  const next = cloneBoard(board);
  const movements: FallMovement[] = [];

  for (let c = 0; c < next.cols; c++) {
    let writeRow = next.rows - 1;

    for (let r = next.rows - 1; r >= 0; r--) {
      const cell = next.cells[r][c];

      // Obstacles are immovable — they act as a floor
      if (cell.kind === "obstacle") {
        writeRow = r - 1;
        continue;
      }
      if (cell.kind === "empty") continue;

      if (r !== writeRow) {
        movements.push({
          from: { row: r, col: c },
          to: { row: writeRow, col: c },
          distance: writeRow - r,
        });
        next.cells[writeRow][c] = cell;
        next.cells[r][c] = { kind: "empty" };
      }
      writeRow--;
    }
  }

  return { board: next, movements };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: REFILL
 *
 * Fills empty cells from top with random colors.
 * Returns refill entries with drop distance for animation.
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: your color palette
const BLOCK_COLORS: BlockColor[] = ["red", "blue", "green", "yellow", "purple"];

function refillBoard(
  board: BoardState,
  colorCount: number = 5, // ADAPT: number of active colors
  rng: () => number = Math.random, // ADAPT: your RNG (seeded for determinism)
): { board: BoardState; refills: RefillEntry[] } {
  const next = cloneBoard(board);
  const palette = BLOCK_COLORS.slice(0, colorCount);
  const refills: RefillEntry[] = [];

  for (let c = 0; c < next.cols; c++) {
    let emptyCount = 0;
    for (let r = 0; r < next.rows; r++) {
      if (next.cells[r][c].kind === "empty") emptyCount++;
    }

    let fillIdx = 0;
    for (let r = 0; r < next.rows; r++) {
      if (next.cells[r][c].kind === "empty") {
        const color = palette[Math.floor(rng() * palette.length)];
        next.cells[r][c] = { kind: "block", color };
        refills.push({
          col: c,
          targetRow: r,
          color,
          dropDistance: emptyCount - fillIdx,
        });
        fillIdx++;
      }
    }
  }

  return { board: next, refills };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: TAP HANDLER (Main Game Loop)
 *
 * This is the core interaction loop. The sequence is LOCKED:
 * tap → validate → clear → gravity → refill → highlight → idle
 *
 * Animation calls are ADAPT — wire to your renderer.
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: your animation/renderer functions
declare function animatePop(positions: GridPos[]): Promise<void>;
declare function animateGravity(movements: FallMovement[]): Promise<void>;
declare function animateRefill(refills: RefillEntry[]): Promise<void>;
declare function animatePowerUpSpawn(type: PowerUpType, pos: GridPos): void;
declare function animateRejectShake(pos: GridPos): void;
declare function animateScorePopup(score: number, pos: GridPos): void;
declare function highlightValidGroups(board: BoardState): void;
declare function clearHighlights(): void;

/**
 * Handle a tap at the given grid position.
 * Returns true if a valid clear occurred.
 *
 * LOCKED sequence — do not reorder or skip steps.
 */
async function handleTap(
  board: BoardState,
  pos: GridPos,
  setState: (board: BoardState) => void, // ADAPT: your state setter
  addScore: (delta: number) => void,      // ADAPT: your score handler
  decrementMoves: () => void,             // ADAPT: your move counter
): Promise<boolean> {
  // 1. Check for power-up tap
  const tappedCell = getCell(board, pos.row, pos.col);
  if (tappedCell?.kind === "powerup") {
    // ADAPT: handle power-up activation via your power-up logic
    return true;
  }

  // 2. Find connected group via BFS
  const group = findGroup(board, pos.row, pos.col);

  // 3. Validate minimum group size
  if (group.length < MIN_GROUP_SIZE) {
    animateRejectShake(pos);
    return false;
  }

  // 4. Calculate score
  const score = calcGroupScore(group.length);
  addScore(score);
  animateScorePopup(score, pos);

  // 5. Clear group from board
  const next = cloneBoard(board);
  for (const p of group) {
    next.cells[p.row][p.col] = { kind: "empty" };
  }

  // 6. Determine and place power-up (at tap position)
  const powerUp = determinePowerUp(group.length);
  if (powerUp) {
    const color = tappedCell!.color!;
    next.cells[pos.row][pos.col] = {
      kind: "powerup",
      powerUpType: powerUp,
      color,
      ...(powerUp === "rocket"
        ? { rocketDirection: determineRocketDirection(group) }
        : {}),
    };
  }

  // 7. Animate pop (200ms)
  clearHighlights();
  await animatePop(group);

  // 8. Apply gravity
  const gravityResult = applyGravity(next);

  // 9. Animate gravity (280ms)
  await animateGravity(gravityResult.movements);

  // 10. Animate power-up spawn (concurrent with gravity, 250ms)
  if (powerUp) {
    animatePowerUpSpawn(powerUp, pos);
  }

  // 11. Refill empty cells
  const refillResult = refillBoard(gravityResult.board);

  // 12. Animate refill (280ms)
  await animateRefill(refillResult.refills);

  // 13. Commit final state
  setState(refillResult.board);

  // 14. Decrement move counter
  decrementMoves();

  // 15. Highlight valid groups for next tap
  highlightValidGroups(refillResult.board);

  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: COORDINATE CONVERSION
 *
 * Convert screen coordinates to grid positions.
 * ADAPT: for PixiJS, use container.toLocal() before this.
 * ═══════════════════════════════════════════════════════════════════════ */

function screenToGrid(
  localX: number,
  localY: number,
): GridPos | null {
  const col = Math.floor(localX / STRIDE);
  const row = Math.floor(localY / STRIDE);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
  return { row, col };
}

function gridToScreen(row: number, col: number): { x: number; y: number } {
  return {
    x: col * STRIDE,
    y: row * STRIDE,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: ANIMATION TIMING CONSTANTS
 *
 * All values are LOCKED. Use these when wiring your renderer.
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  // Pop variants
  POP_FAST_MS: 200,
  POP_PUNCH_MS: 255,
  POP_PUNCH_WINDUP_MS: 55,
  POP_PUNCH_SCALE: 1.08,
  POP_BURST_MS: 420,
  POP_BURST_SWELL_MS: 140,
  POP_BURST_SWELL_SCALE: 1.18,
  POP_BURST_HOLD_MS: 100,
  POP_BURST_HOLD_SCALE: 1.26,

  // Gravity & refill
  FALL_MS: 280,
  FALL_EASE: "back.out(1.4)",  // GSAP notation

  // Power-up spawn
  POWERUP_SCALE_MS: 250,
  POWERUP_ALPHA_MS: 150,
  POWERUP_EASE: "back.out(2)", // GSAP notation

  // Highlight pulse
  HIGHLIGHT_SCALE: 1.05,
  HIGHLIGHT_CYCLE_MS: 800,
  HIGHLIGHT_EASE: "sine.inOut", // GSAP notation

  // Reject shake
  REJECT_AMPLITUDE_PX: 4,
  REJECT_STEP_MS: 40,
  REJECT_TOTAL_MS: 160,

  // Power-up detonation stagger
  ROCKET_STAGGER_MS: 42,
  BOMB_RING_STAGGER_MS: 42,
  BURST_STAGGER_MS: 52,

  // Combo
  COMBO_ANTICIPATION_MS: 900,
  COMBO_SHAKE_PX: 8,
  COMBO_SHAKE_MS: 300,
} as const;
