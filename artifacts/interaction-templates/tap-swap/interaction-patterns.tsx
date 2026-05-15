/**
 * Tap-Swap Interaction Archetype — React/JS Patterns
 *
 * This file contains the definitive patterns for tap-swap interaction.
 * DO NOT rewrite these patterns from scratch.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ LOCKED vs ADAPTABLE                                            │
 * │                                                                 │
 * │ LOCKED — do not change values, logic, or structure:             │
 * │   - FLICK_THRESHOLD (15px)                                      │
 * │   - detectFlickDirection() — use as-is                          │
 * │   - Ghost overlay pattern (swap-slide, --swap-dx/dy, 180ms)    │
 * │   - isGemSwapping() — use as-is                                 │
 * │   - computeDrops() — all formulas, timing values, bounce calcs │
 * │   - cascadeParams() — all scaling formulas                      │
 * │   - computeLaunchPosition() — all arc/shadow/scale math         │
 * │                                                                 │
 * │ ADAPTABLE — change only where marked // ADAPT:                  │
 * │   - Type names (use your game's Gem, Board, Color types)        │
 * │   - Store API calls (your swap/validate/setState functions)     │
 * │   - Board dimensions (BOARD_SIZE, CELL_SIZE, GAP)               │
 * │   - Gem gradient key names (match your color type)              │
 * │                                                                 │
 * │ If you find an improvement, do NOT apply it in the game.        │
 * │ Note it for archetype evolution instead.                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Each section is independent — copy what you need.
 */

import React, { useState, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════ */

const CELL_SIZE = 60;  // ADAPT: match your cell size
const GAP = 4;         // ADAPT: match your grid gap
const STRIDE = CELL_SIZE + GAP;
const FLICK_THRESHOLD = 15; // px — works well for both touch and mouse
const BOARD_SIZE = 8;  // ADAPT: match your board dimensions

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1b: GEM VISUAL STYLE (LOCKED)
 *
 * Gems are colored rounded rectangles with radial gradients.
 * Do NOT use circles, hexagons, diamonds, stars, emoji, or SVG shapes.
 * Color alone distinguishes gems — shape is always the same.
 * Gems fill 100% of their cell — spacing comes from GAP, not from shrinking the gem.
 * Do NOT use width/height < 100% or clipPath on gem elements.
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: key names to match your GemColor type, but keep the gradient values
const GEM_GRADIENTS: Record<string, string> = {
  red:    "radial-gradient(circle at 35% 35%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%)",
  blue:   "radial-gradient(circle at 35% 35%, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)",
  green:  "radial-gradient(circle at 35% 35%, #86efac 0%, #22c55e 50%, #15803d 100%)",
  yellow: "radial-gradient(circle at 35% 35%, #fde68a 0%, #eab308 50%, #a16207 100%)",
  purple: "radial-gradient(circle at 35% 35%, #d8b4fe 0%, #a855f7 50%, #7e22ce 100%)",
};

const GEM_STYLE_BASE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3)",
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: DIRECTION DETECTION
 *
 * Pure function — no adaptation needed. Use as-is.
 * ═══════════════════════════════════════════════════════════════════════ */

type Direction = "up" | "down" | "left" | "right";

function detectFlickDirection(
  dx: number,
  dy: number,
): Direction | null {
  if (Math.abs(dx) < FLICK_THRESHOLD && Math.abs(dy) < FLICK_THRESHOLD)
    return null;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: GESTURE HANDLING (Pointer Events)
 *
 * Wire these three handlers onto your board container element.
 * The board element needs: touch-action: none; position: relative;
 * ═══════════════════════════════════════════════════════════════════════ */

type FlickState = {
  row: number;
  col: number;
  startX: number;
  startY: number;
  committed: boolean;
};

// In your component:
function GesturePattern() {
  // ADAPT: replace with your game state and phase check
  const [gameState, setGameState] = useState<any>(null);
  const [swapAnim, setSwapAnim] = useState<any>(null);
  const [shakeCell, setShakeCell] = useState<string | null>(null);

  const flickRef = useRef<FlickState | null>(null);

  const isInputBlocked = () => {
    // ADAPT: check your game's phase/animation state
    return gameState.phase.type !== "idle" || swapAnim !== null;
  };

  const handlePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      if (isInputBlocked()) return;

      // ADAPT: check if cell has a piece (not empty)
      // if (board[row][col] === null) return;

      flickRef.current = {
        row,
        col,
        startX: e.clientX,
        startY: e.clientY,
        committed: false,
      };

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [gameState, swapAnim],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const flick = flickRef.current;
      if (!flick || flick.committed) return;
      if (isInputBlocked()) return;

      const dx = e.clientX - flick.startX;
      const dy = e.clientY - flick.startY;
      const dir = detectFlickDirection(dx, dy);

      if (dir !== null) {
        flick.committed = true;
        executeSwap(flick.row, flick.col, dir);
      }
    },
    [gameState, swapAnim],
  );

  const handlePointerUp = useCallback(() => {
    const flick = flickRef.current;
    if (flick && !flick.committed) {
      // Gesture not completed — clear selection
      // ADAPT: deselect piece if your game has selection state
    }
    flickRef.current = null;
  }, []);

  // ADAPT: this is your swap execution function
  const executeSwap = (row: number, col: number, dir: Direction) => {
    // See SECTION 4 below
  };

  return null; // placeholder
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: SWAP EXECUTION (Ghost Overlay Pattern)
 *
 * KEY PRINCIPLE: Animate first, commit state after.
 * Ghost overlays are temporary elements that slide while real gems hide.
 * ═══════════════════════════════════════════════════════════════════════ */

type SwapAnimState = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  fromColor: string; // ADAPT: use your color type
  toColor: string;   // ADAPT: use your color type
};

function SwapExecutionPattern() {
  const [swapAnim, setSwapAnim] = useState<SwapAnimState | null>(null);
  const [shakeCell, setShakeCell] = useState<string | null>(null);

  const executeSwap = (row: number, col: number, dir: Direction) => {
    const dRow = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const dCol = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    const toRow = row + dRow;
    const toCol = col + dCol;

    // Bounds check
    if (toRow < 0 || toRow >= BOARD_SIZE || toCol < 0 || toCol >= BOARD_SIZE) {
      setShakeCell(`${row},${col}`);
      setTimeout(() => setShakeCell(null), 450);
      return;
    }

    // ADAPT: call your game's swap/validation function
    // const nextState = trySwap(currentState, dir);
    // const isValid = nextState.phase.type !== "idle";
    const isValid = true; // placeholder
    const nextState = null; // placeholder

    if (!isValid) {
      // Invalid swap — shake both cells
      setShakeCell(`${row},${col}`);
      setTimeout(() => setShakeCell(null), 450);
      return;
    }

    // Valid swap — animate FIRST, commit state AFTER
    // ADAPT: read colors from your board before committing
    const fromColor = "red";  // board[row][col]
    const toColor = "blue";   // board[toRow][toCol]

    setSwapAnim({ fromRow: row, fromCol: col, toRow, toCol, fromColor, toColor });

    setTimeout(() => {
      setSwapAnim(null);
      // ADAPT: commit state here
      // setGameState(nextState);
    }, 180);
  };

  return null; // placeholder
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: GHOST OVERLAY RENDERING
 *
 * Render this inside your board container (position: relative).
 * The ghost elements are absolutely positioned over the grid.
 * ═══════════════════════════════════════════════════════════════════════ */

function GhostOverlayPattern({ swapAnim }: { swapAnim: SwapAnimState | null }) {
  if (!swapAnim) return null;

  const fromX = swapAnim.fromCol * STRIDE;
  const fromY = swapAnim.fromRow * STRIDE;
  const toX = swapAnim.toCol * STRIDE;
  const toY = swapAnim.toRow * STRIDE;
  const dx = toX - fromX;
  const dy = toY - fromY;

  // ADAPT: match your gem's visual style (size, borderRadius, background)
  const ghostBase: React.CSSProperties = {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 10,
    boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3)",
  };

  return (
    <>
      {/* Ghost for "from" gem sliding to "to" position */}
      <div
        className="swap-ghost"
        style={{
          ...ghostBase,
          left: fromX,
          top: fromY,
          background: swapAnim.fromColor, // ADAPT: use your gem gradient/color
          "--swap-dx": `${dx}px`,
          "--swap-dy": `${dy}px`,
        } as React.CSSProperties}
      />
      {/* Ghost for "to" gem sliding to "from" position */}
      <div
        className="swap-ghost"
        style={{
          ...ghostBase,
          left: toX,
          top: toY,
          background: swapAnim.toColor, // ADAPT: use your gem gradient/color
          "--swap-dx": `${-dx}px`,
          "--swap-dy": `${-dy}px`,
        } as React.CSSProperties}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: HIDING REAL GEMS DURING SWAP
 *
 * In your gem render loop, add opacity: 0 for swapping cells.
 * ═══════════════════════════════════════════════════════════════════════ */

function isGemSwapping(
  swapAnim: SwapAnimState | null,
  row: number,
  col: number,
): boolean {
  if (!swapAnim) return false;
  return (
    (swapAnim.fromRow === row && swapAnim.fromCol === col) ||
    (swapAnim.toRow === row && swapAnim.toCol === col)
  );
}

// In your gem style: opacity: isGemSwapping(swapAnim, row, col) ? 0 : undefined

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 7: GRAVITY DROP COMPUTATION (LOCKED)
 *
 * Computes which gems need drop/spawn animations after a fill.
 * Diffs old vs new board by gem.id — only moved/new gems get animations.
 *
 * Every gem has a stable unique numeric `id` (required by phase 20).
 * The Map is keyed by gem.id so the render loop can look up animations
 * per-gem with: dropAnims.get(gem.id)
 *
 * DO NOT change the formulas, timing values, or key strategy.
 * ═══════════════════════════════════════════════════════════════════════ */

type DropInfo = {
  distance: number;
  isSpawn: boolean;
  delay: number;
  duration: number;
  bounceHeight: number;
};

// ADAPT: replace `any` with your Gem type (must have { id: number } at minimum)
type GemLike = { id: number } | null;

function computeDrops(
  oldBoard: GemLike[][], // ADAPT: use your board type (2D array, null = empty)
  newBoard: GemLike[][],
  chainDepth: number,
): Map<number, DropInfo> {
  const result = new Map<number, DropInfo>();
  const speedScale = 1 / (1 + chainDepth * 0.2); // faster each cascade

  // Build lookup: gem.id → old position
  const oldPositions = new Map<number, { row: number; col: number }>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const gem = oldBoard[r][c];
      if (gem) oldPositions.set(gem.id, { row: r, col: c });
    }
  }

  // Compare each gem in new board to its old position
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const gem = newBoard[r][c];
      if (!gem) continue;

      const oldPos = oldPositions.get(gem.id);

      if (!oldPos) {
        // New gem — spawned from above the board
        const dropDist = r + 1;
        const baseDur = (250 + dropDist * 60) * speedScale;
        result.set(gem.id, {
          distance: dropDist,
          isSpawn: true,
          delay: c * 25 + 40 + Math.random() * 20,
          duration: baseDur,
          bounceHeight: Math.min(2 + dropDist * 1.2 + chainDepth * 2, 10),
        });
      } else if (oldPos.row < r) {
        // Existing gem moved down
        const distance = r - oldPos.row;
        const baseDur = (200 + distance * 60) * speedScale;
        result.set(gem.id, {
          distance,
          isSpawn: false,
          delay: c * 25 + Math.random() * 20,
          duration: baseDur,
          bounceHeight: Math.min(3 + distance * 1.5 + chainDepth * 2, 12),
        });
      }
      // If oldPos.row === r: gem didn't move — no animation
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 8: APPLYING DROP ANIMATIONS TO GEMS (LOCKED)
 *
 * In your gem render loop, look up animations by gem.id:
 *   const dropInfo = dropAnims.get(gem.id);
 *
 * Then apply the style and className below.
 * DO NOT change the style property names or className logic.
 * ═══════════════════════════════════════════════════════════════════════ */

function getDropStyle(dropInfo: DropInfo | undefined): React.CSSProperties {
  if (!dropInfo) return {};

  const dropPx = -dropInfo.distance * STRIDE;
  return {
    "--drop-from": `${dropPx}px`,
    "--bounce-up": `${-dropInfo.bounceHeight}px`,
    "--drop-duration": `${dropInfo.duration}ms`,
    "--drop-delay": `${dropInfo.delay}ms`,
    willChange: "transform, opacity",
  } as React.CSSProperties;
}

// Look up by gem.id:   const dropInfo = dropAnims.get(gem.id);
// Apply className:     dropInfo?.isSpawn ? "gem-spawning" : dropInfo ? "gem-dropping" : ""
// Apply style:         ...getDropStyle(dropInfo)

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 9: CASCADE ESCALATION PARAMETERS
 *
 * Use these to scale timing and visual intensity with chain depth.
 * ═══════════════════════════════════════════════════════════════════════ */

function cascadeParams(chainDepth: number) {
  return {
    /** Merge resolution delay (ms) — faster at deeper cascades */
    mergeDelay: Math.max(200, 450 - chainDepth * 60),

    /** Launch flight duration (ms) — faster at deeper cascades */
    launchDuration: Math.max(350, 500 - chainDepth * 40),

    /** Drop speed scale — multiplier on base drop duration */
    dropSpeedScale: 1 / (1 + chainDepth * 0.2),

    /** Board flash duration (s) — faster at deeper cascades */
    flashDuration: Math.max(0.3, 0.6 - chainDepth * 0.1),

    /** Score popup font size */
    scoreFontSize: 28 + chainDepth * 6,

    /** Score popup scale multiplier */
    scoreScale: 1 + chainDepth * 0.15,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 10: LAUNCH / FLIGHT ARC (for merge-launch games)
 *
 * Render this with requestAnimationFrame, not CSS keyframes.
 * The arc is procedural because it depends on distance and chain depth.
 * ═══════════════════════════════════════════════════════════════════════ */

type LaunchAnim = {
  color: string;        // ADAPT: use your color type
  originRow: number;
  originCol: number;
  targetRow: number;
  targetCol: number;
  progress: number;     // 0 to 1, updated via rAF
};

function computeLaunchPosition(anim: LaunchAnim) {
  const t = anim.progress;

  const ox = anim.originCol * STRIDE + CELL_SIZE / 2;
  const oy = anim.originRow * STRIDE + CELL_SIZE / 2;
  const tx = anim.targetCol * STRIDE + CELL_SIZE / 2;
  const ty = anim.targetRow * STRIDE + CELL_SIZE / 2;

  // Parabolic arc — height scales with distance
  const arcHeight = Math.max(80, Math.hypot(tx - ox, ty - oy) * 0.6);
  const peakFactor = 1 - (2 * t - 1) ** 2; // peaks at t=0.5
  const arcOffset = -arcHeight * peakFactor;

  // Flying piece position
  const flyX = ox + (tx - ox) * t;
  const flyY = oy + (ty - oy) * t + arcOffset;

  // Ground shadow position (linear path)
  const shadowX = ox + (tx - ox) * t;
  const shadowY = oy + (ty - oy) * t;

  // Scale peaks at midpoint
  const scale = 1 + 0.25 * peakFactor;

  // Landing impact (last 8%)
  const isLanding = t > 0.92;
  const landScale = isLanding ? 1 + 0.3 * (1 - (t - 0.92) / 0.08) : scale;

  // Shadow properties
  const shadowScale = 1 + 0.2 * peakFactor;
  const shadowOpacity = 0.15 + 0.25 * peakFactor;
  const shadowBlur = 4 + 8 * peakFactor;

  return {
    flyX,
    flyY,
    shadowX,
    shadowY,
    scale: isLanding ? landScale : scale,
    shadowScale,
    shadowOpacity,
    shadowBlur,
    peakFactor,
    isLanding,
  };
}
