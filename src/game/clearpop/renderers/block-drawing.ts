/**
 * Toy-Blast-style block drawing helpers.
 *
 * Gradient-filled rounded rects for gem blocks, radial-gradient circles
 * for bubble obstacles. Gradients are cached per color to avoid allocation.
 */

import { FillGradient, type Graphics } from 'pixi.js';
import type { BlockColor } from '../state/types';
import { BLOCK_THEMES, BUBBLE_THEME, type ColorTheme } from './block-theme';

const blockGradientCache = new Map<BlockColor, FillGradient>();
let bubbleGradient: FillGradient | undefined;

function buildLinearGradient(theme: ColorTheme): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    textureSpace: 'local',
    colorStops: [
      { offset: 0, color: theme.lighter },
      { offset: 0.5, color: theme.base },
      { offset: 1, color: theme.darker },
    ],
  });
}

function getBlockGradient(color: BlockColor): FillGradient {
  let grad = blockGradientCache.get(color);
  if (!grad) {
    grad = buildLinearGradient(BLOCK_THEMES[color]);
    blockGradientCache.set(color, grad);
  }
  return grad;
}

function getBubbleGradient(): FillGradient {
  if (!bubbleGradient) {
    bubbleGradient = new FillGradient({
      type: 'radial',
      center: { x: 0.32, y: 0.28 },
      innerRadius: 0,
      outerCenter: { x: 0.52, y: 0.55 },
      outerRadius: 0.58,
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: BUBBLE_THEME.lighter },
        { offset: 0.42, color: BUBBLE_THEME.base },
        { offset: 1, color: BUBBLE_THEME.darker },
      ],
    });
  }
  return bubbleGradient;
}

/** Grid gem block — top-left origin, fills [0, cellSize]². */
export function drawToyBlockGem(
  g: Graphics,
  cellSize: number,
  color: BlockColor,
  hasPowerUp: boolean,
): void {
  const pad = cellSize * 0.03;
  const w = cellSize - pad * 2;
  const h = cellSize - pad * 2;
  const rad = Math.max(2, cellSize * 0.08);
  const grad = getBlockGradient(color);

  g.clear();
  g.roundRect(pad, pad, w, h, rad).fill(grad);
  g.roundRect(pad, pad, w, h, rad).stroke({
    width: 1,
    color: 0xffffff,
    alpha: 0.18,
  });

  if (hasPowerUp) {
    g.roundRect(pad, pad, w, h, rad).stroke({
      width: Math.max(2, cellSize * 0.04),
      color: 0xffffff,
      alpha: 0.65,
    });
  }
}

/** HUD goal chip — fills [0, cellSize]² (top-left origin). */
export function drawToyBlockGemChip(
  g: Graphics,
  cellSize: number,
  color: BlockColor,
): void {
  const pad = cellSize * 0.03;
  const w = cellSize - pad * 2;
  const h = cellSize - pad * 2;
  const rad = Math.max(2, cellSize * 0.08);
  const grad = getBlockGradient(color);

  g.clear();
  g.roundRect(pad, pad, w, h, rad).fill(grad);
  g.roundRect(pad, pad, w, h, rad).stroke({
    width: 1,
    color: 0xffffff,
    alpha: 0.18,
  });
}

/** Gem block drawn as a colored bubble circle. */
export function drawColoredBubble(
  g: Graphics,
  cellSize: number,
  color: BlockColor,
  hasPowerUp: boolean,
): void {
  const pad = cellSize * 0.045;
  const w = cellSize - pad * 2;
  const r = w / 2;
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const grad = getBlockGradient(color);

  g.clear();
  g.circle(cx, cy, r).fill(grad);

  const hx = cx - r * 0.38;
  const hy = cy - r * 0.4;
  const rx = r * 0.26;
  const ry = r * 0.19;
  g.ellipse(hx, hy, rx, ry).fill({ color: 0xffffff, alpha: 0.5 });

  g.circle(cx, cy, r).stroke({
    width: 1.25,
    color: 0xffffff,
    alpha: 0.42,
  });

  if (hasPowerUp) {
    g.circle(cx, cy, r).stroke({
      width: Math.max(2, cellSize * 0.04),
      color: 0xffffff,
      alpha: 0.65,
    });
  }
}

/**
 * Gray obstacle block with crack lines based on damage.
 * Stages: 0 cracks (full HP), 1 crack, 2 cracks, 3 cracks.
 * `hp` is current HP — cracks = maxHp - hp (passed as `damage`).
 */
export function drawObstacleRect(
  g: Graphics,
  cellSize: number,
  damage: number,
): void {
  const pad = cellSize * 0.03;
  const w = cellSize - pad * 2;
  const h = cellSize - pad * 2;
  const rad = Math.max(2, cellSize * 0.08);

  g.clear();

  // Gray stone gradient
  g.roundRect(pad, pad, w, h, rad).fill({ color: 0x6b7280 });
  // Lighter top edge
  g.roundRect(pad, pad, w, h * 0.45, rad).fill({ color: 0x9ca3af, alpha: 0.4 });
  // Border
  g.roundRect(pad, pad, w, h, rad).stroke({ width: 1.5, color: 0x4b5563, alpha: 0.8 });

  // Crack lines based on damage taken
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const crackColor = 0x1f2937;
  const crackAlpha = 0.7;
  const crackWidth = Math.max(1.5, cellSize * 0.025);

  if (damage >= 1) {
    // First crack: diagonal from upper-left toward center
    g.moveTo(cx - w * 0.3, cy - h * 0.35)
      .lineTo(cx - w * 0.05, cy - h * 0.05)
      .lineTo(cx + w * 0.1, cy + h * 0.15)
      .stroke({ width: crackWidth, color: crackColor, alpha: crackAlpha });
  }

  if (damage >= 2) {
    // Second crack: from upper-right, branching
    g.moveTo(cx + w * 0.25, cy - h * 0.3)
      .lineTo(cx + w * 0.05, cy)
      .lineTo(cx - w * 0.15, cy + h * 0.25)
      .stroke({ width: crackWidth, color: crackColor, alpha: crackAlpha });
  }

  if (damage >= 3) {
    // Third crack: horizontal split across middle
    g.moveTo(cx - w * 0.35, cy + h * 0.05)
      .lineTo(cx, cy - h * 0.08)
      .lineTo(cx + w * 0.35, cy + h * 0.1)
      .stroke({ width: crackWidth, color: crackColor, alpha: crackAlpha });
    // Fragment lines
    g.moveTo(cx - w * 0.05, cy - h * 0.05)
      .lineTo(cx - w * 0.2, cy + h * 0.35)
      .stroke({ width: crackWidth * 0.8, color: crackColor, alpha: crackAlpha * 0.6 });
  }
}

/** Obstacle drawn as a rounded rect using the bubble theme gradient. */
export function drawObstacleBlock(
  g: Graphics,
  cellSize: number,
  hasPowerUp: boolean,
): void {
  const pad = cellSize * 0.03;
  const w = cellSize - pad * 2;
  const h = cellSize - pad * 2;
  const rad = Math.max(2, cellSize * 0.08);
  const grad = getBubbleGradient();

  g.clear();
  g.roundRect(pad, pad, w, h, rad).fill(grad);
  g.roundRect(pad, pad, w, h, rad).stroke({
    width: 1,
    color: 0xffffff,
    alpha: 0.18,
  });

  if (hasPowerUp) {
    g.roundRect(pad, pad, w, h, rad).stroke({
      width: Math.max(2, cellSize * 0.04),
      color: 0xffffff,
      alpha: 0.65,
    });
  }
}

/**
 * Circular bubble obstacle — top-left origin, fills [0, cellSize]².
 * Radial gradient with off-center specular highlight and white rim.
 */
export function drawBubbleBlockObstacle(
  g: Graphics,
  cellSize: number,
  hasPowerUp: boolean,
): void {
  const pad = cellSize * 0.045;
  const w = cellSize - pad * 2;
  const r = w / 2;
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const grad = getBubbleGradient();

  g.clear();
  g.circle(cx, cy, r).fill(grad);

  const hx = cx - r * 0.38;
  const hy = cy - r * 0.4;
  const rx = r * 0.26;
  const ry = r * 0.19;
  g.ellipse(hx, hy, rx, ry).fill({ color: 0xffffff, alpha: 0.5 });

  g.circle(cx, cy, r).stroke({
    width: 1.25,
    color: 0xffffff,
    alpha: 0.42,
  });

  if (hasPowerUp) {
    g.circle(cx, cy, r).stroke({
      width: Math.max(2, cellSize * 0.04),
      color: 0xffffff,
      alpha: 0.65,
    });
  }
}
