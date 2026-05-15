/**
 * Pixi Juice Orchestrator — maps game events to Pixi visual feedback.
 *
 * Particles, screen shake, haptics, fly-text, confetti.
 * All effects are fire-and-forget; they never block the game loop.
 */

import gsap from 'gsap';
import type { Container } from 'pixi.js';
import type { BlockColor, GridPos, PowerUpType, ObstacleType } from '../state/types';
import type { ComboType } from '../state/powerup-logic';
import {
  colorFlash,
  flyText,
  freezeFrame,
  screenShake,
  shakeElement,
  zoomPunch,
} from './pixi-effects';
import { haptic } from './haptics';
import {
  spawnBubblePopParticles,
  spawnConfetti,
  spawnEggShellParticles,
  spawnExplosionParticles,
  spawnIceShardParticles,
  spawnParticles,
} from './pixi-particles';
import {
  BOMB_STAGGER_MS,
  COLOR_BURST_STAGGER_MS,
  maxBombRingDistance,
  ROCKET_STAGGER_MS,
  sortBombSquareOutward,
  sortBurstReadingOrder,
  sortRocketLineOutward,
} from './powerup-juice';

// ---------------------------------------------------------------------------
// Color maps (BlockColor → hex/number)
// ---------------------------------------------------------------------------

const CELL_COLORS: Record<BlockColor, number> = {
  blue: 0x9b7ed8,
  red: 0xf04840,
  yellow: 0xffa040,
};

const CELL_COLOR_HEX: Record<BlockColor, string> = {
  blue: '#9B7ED8',
  red: '#F04840',
  yellow: '#FFA040',
};

const CONFETTI_PALETTE = [
  0xb44ac0, 0xe63946, 0xf4a236, 0x4caf50, 0x3d5afe,
  0xffd54f, 0x22d3ee, 0x00e5cc,
];

const MAX_ESCALATION_DEPTH = 8;

const escalate = (base: number, chainDepth: number, factor: number): number =>
  base * factor ** Math.min(chainDepth, MAX_ESCALATION_DEPTH);

// ---------------------------------------------------------------------------
// Cell map — adapts BoardRenderer to the juice system
// ---------------------------------------------------------------------------

export interface PixiCellMap {
  getCellCenter: (col: number, row: number) => { x: number; y: number } | null;
  getGroupCentroid: (positions: GridPos[]) => { x: number; y: number } | null;
  getCellContainer: (col: number, row: number) => Container | null;
  getObstacleArt?: (col: number, row: number) => Container | null;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export interface JuiceEvent {
  type:
    | 'group_cleared'
    | 'cascade_cleared'
    | 'invalid_tap'
    | 'power_up_created'
    | 'power_up_detonated'
    | 'combo_detonated'
    | 'level_won'
    | 'level_lost'
    | 'obstacle_cracked'
    | 'obstacle_cleared';
  positions?: GridPos[];
  tapPosition?: GridPos;
  blockColor?: BlockColor;
  scoreDelta?: number;
  chainDepth?: number;
  cascadeTotal?: number;
  powerUpType?: PowerUpType;
  rocketDirection?: 'up' | 'down' | 'left' | 'right';
  comboType?: ComboType;
  obstacleType?: ObstacleType;
  bubbleBlastPositions?: GridPos[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function processPixiJuice(
  stage: Container,
  gridContainer: Container,
  events: JuiceEvent[],
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const bubbleClearedByPowerBlast = new Set(
    events.flatMap((e) =>
      e.type === 'power_up_detonated' || e.type === 'combo_detonated'
        ? (e.bubbleBlastPositions ?? [])
        : [],
    ).map((p) => `${p.col},${p.row}`),
  );

  let totalCascade = 0;

  for (const event of events) {
    totalCascade += event.cascadeTotal ?? 0;

    switch (event.type) {
      case 'group_cleared':
        haptic('light');
        handleGroupCleared(stage, gridContainer, event, cellMap);
        break;
      case 'cascade_cleared':
        haptic('medium');
        handleGroupCleared(stage, gridContainer, event, cellMap);
        break;
      case 'invalid_tap':
        handleInvalidTap(event, cellMap);
        break;
      case 'power_up_created':
        haptic('medium');
        handlePowerUpCreated(stage, gridContainer, event, cellMap);
        break;
      case 'power_up_detonated':
        haptic('heavy');
        handlePowerUpDetonated(stage, gridContainer, event, cellMap, stageWidth);
        break;
      case 'combo_detonated':
        haptic('rigid');
        handleComboDetonated(stage, gridContainer, event, cellMap, stageWidth);
        break;
      case 'level_won':
        haptic('heavy');
        handleLevelWon(stage, gridContainer, stageWidth);
        break;
      case 'level_lost':
        handleLevelLost(stage, stageWidth);
        break;
      case 'obstacle_cracked':
        haptic('light');
        handleObstacleCracked(gridContainer, event, cellMap);
        break;
      case 'obstacle_cleared':
        handleObstacleCleared(stage, gridContainer, event, cellMap, bubbleClearedByPowerBlast);
        break;
    }
  }

  if (totalCascade >= 5) {
    screenShake(gridContainer, 8, 250, true);
    zoomPunch(gridContainer, 1.03, 200);
    spawnConfetti(stage, 40, CONFETTI_PALETTE, 1200, stageWidth);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveColor(event: JuiceEvent): number {
  return CELL_COLORS[event.blockColor ?? 'blue'] ?? 0xffffff;
}

function resolveColorHex(event: JuiceEvent): string {
  return CELL_COLOR_HEX[event.blockColor ?? 'blue'] ?? '#FFFFFF';
}

function particleColorForBlastPos(
  event: JuiceEvent,
  pos: GridPos,
  defaultColor: number,
): number {
  const bubbles = event.bubbleBlastPositions ?? [];
  const isBubble = bubbles.some((b) => b.col === pos.col && b.row === pos.row);
  return isBubble ? 0x22d3ee : defaultColor;
}

// ---------------------------------------------------------------------------
// Group clear
// ---------------------------------------------------------------------------

function handleGroupCleared(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  const { positions = [], scoreDelta = 0, chainDepth = 0 } = event;
  const color = resolveColor(event);
  const colorHex = resolveColorHex(event);

  for (const pos of positions) {
    const center = cellMap.getCellCenter(pos.col, pos.row);
    if (center) {
      const count = Math.min(Math.round(escalate(5, chainDepth, 1.5)), 20);
      spawnParticles(stage, center.x, center.y, color, count);
    }
  }

  if (scoreDelta > 0) {
    const centroid = cellMap.getGroupCentroid(positions);
    if (centroid) {
      const scaleFactor = 1 + chainDepth * 0.15;
      flyText(stage, `+${scoreDelta}`, centroid.x, centroid.y, colorHex, 600, scaleFactor);
    }
  }

  if (chainDepth >= 2) {
    const amp = escalate(3, chainDepth, 1.3);
    screenShake(grid, amp, 150 + chainDepth * 10);
    colorFlash(stage, color, 0.2, 100);
  }
}

// ---------------------------------------------------------------------------
// Invalid tap
// ---------------------------------------------------------------------------

function handleInvalidTap(event: JuiceEvent, cellMap: PixiCellMap): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    if (cell) shakeElement(cell, 3, 100);
  }
}

// ---------------------------------------------------------------------------
// Power-up creation
// ---------------------------------------------------------------------------

function handlePowerUpCreated(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  const { positions = [] } = event;
  const color = resolveColor(event);

  screenShake(grid, 2, 100);
  colorFlash(stage, color, 0.15, 100);

  for (const pos of positions) {
    const center = cellMap.getCellCenter(pos.col, pos.row);
    if (center) {
      spawnParticles(stage, center.x, center.y, color, 14);
    }
  }

  void freezeFrame(30);
}

// ---------------------------------------------------------------------------
// Power-up detonation
// ---------------------------------------------------------------------------

function handlePowerUpDetonated(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { powerUpType, positions = [] } = event;
  const color = resolveColor(event);

  if (powerUpType === 'rocket') {
    handleRocketJuice(stage, grid, event, cellMap);
    return;
  }

  if (powerUpType === 'bomb') {
    handleBombJuice(stage, grid, event, cellMap, stageWidth);
    return;
  }

  if (powerUpType === 'color_blast') {
    handleColorBurstJuice(stage, grid, event, cellMap);
    return;
  }

  for (const pos of positions) {
    const center = cellMap.getCellCenter(pos.col, pos.row);
    if (center) {
      const pc = particleColorForBlastPos(event, pos, color);
      spawnExplosionParticles(stage, center.x, center.y, pc, 12);
    }
  }
  screenShake(grid, 4, 150);
}

// ---------------------------------------------------------------------------
// Rocket juice
// ---------------------------------------------------------------------------

function handleRocketJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  const { positions = [], tapPosition } = event;
  const color = resolveColor(event);
  if (!tapPosition || positions.length === 0) return;

  const dir = event.rocketDirection ?? 'right';
  const ordered = sortRocketLineOutward(positions, tapPosition, dir);

  ordered.forEach((pos, i) => {
    gsap.delayedCall((i * ROCKET_STAGGER_MS) / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 14);
      }
    });
  });

  const totalMs = Math.max(0, (ordered.length - 1) * ROCKET_STAGGER_MS + 200);
  gsap.delayedCall(totalMs / 1000, () => {
    screenShake(grid, 5, 180);
  });
}

// ---------------------------------------------------------------------------
// Bomb juice
// ---------------------------------------------------------------------------

function handleBombJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { positions = [], tapPosition } = event;
  const color = resolveColor(event);
  if (!tapPosition || positions.length === 0) return;

  const origin = tapPosition;
  const ordered = sortBombSquareOutward(positions, origin);

  ordered.forEach((pos) => {
    const ring = Math.max(
      Math.abs(pos.col - origin.col),
      Math.abs(pos.row - origin.row),
    );
    gsap.delayedCall((ring * BOMB_STAGGER_MS) / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 14);
      }
    });
  });

  const maxRing = maxBombRingDistance(ordered, origin);
  const lastRingEndMs = maxRing * BOMB_STAGGER_MS + 200;
  const aftermathDelayMs = lastRingEndMs + 140;

  gsap.delayedCall(aftermathDelayMs / 1000, () => {
    screenShake(grid, 8, 250, true);
    zoomPunch(grid, 1.03, 200);
    spawnConfetti(stage, 35, CONFETTI_PALETTE, 1200, stageWidth);
    colorFlash(stage, 0xff6b5a, 0.15, 100);
  });
}

// ---------------------------------------------------------------------------
// Color burst juice
// ---------------------------------------------------------------------------

function handleColorBurstJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  const { positions = [] } = event;
  const color = resolveColor(event);

  colorFlash(stage, color, 0.12, 90);

  const ordered = sortBurstReadingOrder(positions);

  ordered.forEach((pos, i) => {
    gsap.delayedCall((i * COLOR_BURST_STAGGER_MS) / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 22);
      }
    });
  });

  const sweepEndMs = Math.max(0, (ordered.length - 1) * COLOR_BURST_STAGGER_MS + 420);
  gsap.delayedCall(sweepEndMs / 1000, () => {
    screenShake(grid, 5, 160);
  });
}

// ---------------------------------------------------------------------------
// Combo detonation — type-specific staggered particles + heavy feedback
// ---------------------------------------------------------------------------

function handleComboDetonated(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { comboType } = event;

  if (!comboType) {
    handleComboGenericFallback(stage, grid, event, cellMap, stageWidth);
    return;
  }

  switch (comboType) {
    case 'rocket_rocket':
      handleComboRocketJuice(stage, grid, event, cellMap, stageWidth);
      break;
    case 'rocket_bomb':
    case 'bomb_bomb':
      handleComboBombJuice(stage, grid, event, cellMap, stageWidth);
      break;
    case 'rocket_colorblast':
    case 'bomb_colorblast':
    case 'colorblast_colorblast':
      handleComboBurstJuice(stage, grid, event, cellMap, stageWidth);
      break;
  }
}

function comboAftermath(
  stage: Container,
  grid: Container,
  color: number,
  stageWidth: number,
  delayMs: number,
): void {
  gsap.delayedCall(delayMs / 1000, () => {
    screenShake(grid, 10, 300, true);
    zoomPunch(grid, 1.05, 250);
    spawnConfetti(stage, 50, CONFETTI_PALETTE, 1200, stageWidth);
    colorFlash(stage, color, 0.18, 150);
  });
}

function handleComboRocketJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { positions = [], tapPosition } = event;
  const color = resolveColor(event);
  if (!tapPosition || positions.length === 0) return;

  const origin = tapPosition;
  const ordered = [...positions].sort((a, b) => {
    const distA = Math.max(Math.abs(a.row - origin.row), Math.abs(a.col - origin.col));
    const distB = Math.max(Math.abs(b.row - origin.row), Math.abs(b.col - origin.col));
    return distA - distB;
  });

  let prevDist = -1;
  let ringIndex = -1;

  for (const pos of ordered) {
    const dist = Math.max(Math.abs(pos.row - origin.row), Math.abs(pos.col - origin.col));
    if (dist !== prevDist) {
      ringIndex++;
      prevDist = dist;
    }
    const delay = ringIndex * ROCKET_STAGGER_MS;
    gsap.delayedCall(delay / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 14);
      }
    });
  }

  const totalMs = Math.max(0, ringIndex * ROCKET_STAGGER_MS + 200);
  comboAftermath(stage, grid, color, stageWidth, totalMs);
}

function handleComboBombJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { positions = [], tapPosition } = event;
  const color = resolveColor(event);
  if (!tapPosition || positions.length === 0) return;

  const origin = tapPosition;
  const ordered = sortBombSquareOutward(positions, origin);

  for (const pos of ordered) {
    const ring = Math.max(
      Math.abs(pos.col - origin.col),
      Math.abs(pos.row - origin.row),
    );
    gsap.delayedCall((ring * BOMB_STAGGER_MS) / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 14);
      }
    });
  }

  const maxRing = maxBombRingDistance(ordered, origin);
  const lastRingEndMs = maxRing * BOMB_STAGGER_MS + 200;
  comboAftermath(stage, grid, color, stageWidth, lastRingEndMs + 140);
}

function handleComboBurstJuice(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { positions = [] } = event;
  const color = resolveColor(event);

  colorFlash(stage, color, 0.15, 120);

  const ordered = sortBurstReadingOrder(positions);

  ordered.forEach((pos, i) => {
    gsap.delayedCall((i * COLOR_BURST_STAGGER_MS) / 1000, () => {
      const center = cellMap.getCellCenter(pos.col, pos.row);
      if (center) {
        const pc = particleColorForBlastPos(event, pos, color);
        spawnExplosionParticles(stage, center.x, center.y, pc, 22);
      }
    });
  });

  const sweepEndMs = Math.max(0, (ordered.length - 1) * COLOR_BURST_STAGGER_MS + 420);
  comboAftermath(stage, grid, color, stageWidth, sweepEndMs);
}

function handleComboGenericFallback(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  stageWidth: number,
): void {
  const { positions = [] } = event;
  const color = resolveColor(event);

  screenShake(grid, 10, 300, true);
  zoomPunch(grid, 1.05, 250);
  spawnConfetti(stage, 50, CONFETTI_PALETTE, 1200, stageWidth);
  colorFlash(stage, color, 0.15, 150);

  for (const pos of positions) {
    const center = cellMap.getCellCenter(pos.col, pos.row);
    if (center) {
      const pc = particleColorForBlastPos(event, pos, color);
      spawnExplosionParticles(stage, center.x, center.y, pc, 16);
    }
  }
}

// ---------------------------------------------------------------------------
// Obstacle handlers
// ---------------------------------------------------------------------------

function handleObstacleCracked(
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  const { obstacleType } = event;

  if (obstacleType === 'egg') {
    handleEggCracked(grid, event, cellMap);
    return;
  }

  if (obstacleType === 'safe') {
    handleSafeCracked(event, cellMap);
    return;
  }

  if (obstacleType === 'ice') {
    handleGenericCrack(event, cellMap);
    return;
  }

  if (obstacleType === 'cookie') {
    handleGenericCrack(event, cellMap);
    return;
  }

  if (obstacleType === 'jelly') {
    handleGenericCrack(event, cellMap);
    return;
  }
}

function handleObstacleCleared(
  stage: Container,
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
  bubbleClearedByPowerBlast: Set<string>,
): void {
  const { obstacleType } = event;

  if (obstacleType === 'marshmallow') {
    haptic('light');
    const positions = (event.positions ?? []).filter(
      (p) => !bubbleClearedByPowerBlast.has(`${p.col},${p.row}`),
    );
    if (positions.length > 0) {
      handleBubbleBlockCleared(stage, { ...event, positions }, cellMap);
    }
    return;
  }

  if (obstacleType === 'egg') {
    haptic('medium');
    handleEggDestroyed(stage, event, cellMap);
    return;
  }

  if (obstacleType === 'ice') {
    haptic('medium');
    handleIceShattered(stage, event, cellMap);
    return;
  }

  if (obstacleType === 'cage' || obstacleType === 'safe') {
    haptic('light');
    handleFastObstaclePop(event, cellMap);
    return;
  }

  if (obstacleType === 'cookie') {
    haptic('medium');
    handleFastObstaclePop(event, cellMap);
    return;
  }

  if (obstacleType === 'jelly') {
    haptic('light');
    handleFastObstaclePop(event, cellMap);
    return;
  }
}

function handleIceShattered(
  stage: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    const center = cellMap.getCellCenter(pos.col, pos.row);

    if (cell) {
      gsap.killTweensOf(cell);
      gsap.killTweensOf(cell.scale);
      gsap.to(cell, { alpha: 0, duration: 0.18, ease: 'power2.in' });
      gsap.to(cell.scale, { x: 0, y: 0, duration: 0.18, ease: 'back.in(2)' });
    }

    if (center) {
      spawnIceShardParticles(stage, center.x, center.y, 14);
    }
  }
}

// ---------------------------------------------------------------------------
// Bubble
// ---------------------------------------------------------------------------

function handleBubbleBlockCleared(
  stage: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    const center = cellMap.getCellCenter(pos.col, pos.row);

    if (cell) {
      gsap.killTweensOf(cell.scale);
      gsap.killTweensOf(cell);

      const bx = cell.scale.x;
      const by = cell.scale.y;
      gsap.timeline()
        .to(cell.scale, { x: bx * 1.05, y: by * 1.05, duration: 0.05, ease: 'power2.out' })
        .to(cell, { alpha: 0, duration: 0.2, ease: 'power2.in' })
        .to(cell.scale, { x: 0, y: 0, duration: 0.2, ease: 'back.in(2)' }, '<');
    }

    if (center) {
      spawnBubblePopParticles(stage, center.x, center.y, 8);
    }
  }
}

// ---------------------------------------------------------------------------
// Egg
// ---------------------------------------------------------------------------

function handleEggCracked(
  grid: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const egg = cellMap.getObstacleArt?.(pos.col, pos.row);
    if (!egg) continue;

    const origX = egg.x;
    const origY = egg.y;
    const pivotShift = Math.max(egg.height * 0.45, 18);
    egg.pivot.y = pivotShift;
    egg.y = origY + pivotShift;

    gsap.killTweensOf(egg.scale);
    const ebx = egg.scale.x;
    const eby = egg.scale.y;
    const compensateY = () => { egg.y = origY + pivotShift * egg.scale.y; };
    gsap.timeline()
      .to(egg.scale, { x: ebx * 1.2, y: eby * 1.2, duration: 0.06, ease: 'power2.out', onUpdate: compensateY })
      .to(egg.scale, { x: ebx, y: eby, duration: 0.09, ease: 'power2.in', onUpdate: compensateY });

    gsap.timeline({
      onComplete: () => {
        egg.pivot.y = 0;
        egg.y = origY;
        egg.rotation = 0;
        egg.x = origX;
      },
    })
      .to(egg, { x: origX + 10, rotation: 0.18, duration: 0.07, ease: 'power2.out' })
      .to(egg, { x: origX - 8, rotation: -0.14, duration: 0.07, ease: 'power2.inOut' })
      .to(egg, { x: origX + 6, rotation: 0.09, duration: 0.06, ease: 'power2.inOut' })
      .to(egg, { x: origX - 3, rotation: -0.04, duration: 0.05, ease: 'power2.inOut' })
      .to(egg, { x: origX, rotation: 0, duration: 0.04, ease: 'power2.in' });

    const center = cellMap.getCellCenter(pos.col, pos.row);
    if (center) {
      spawnEggShellParticles(grid, center.x, center.y, 10);
    }
  }
}

function handleEggDestroyed(
  stage: Container,
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const egg = cellMap.getObstacleArt?.(pos.col, pos.row);
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    const center = cellMap.getCellCenter(pos.col, pos.row);

    if (egg) {
      gsap.killTweensOf(egg);
      gsap.killTweensOf(egg.scale);
      egg.alpha = 0;
      egg.scale.set(0);
    }
    if (cell) {
      gsap.killTweensOf(cell);
      gsap.killTweensOf(cell.scale);
      cell.alpha = 0;
    }
    if (center) {
      spawnEggShellParticles(stage, center.x, center.y, 28, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Safe — first hit makes it translucent (88% opacity)
// ---------------------------------------------------------------------------

function handleSafeCracked(
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    if (!cell) continue;
    gsap.killTweensOf(cell);
    gsap.to(cell, { alpha: 0.88, duration: 0.15, ease: 'power2.out' });
    shakeElement(cell, 2, 80);
  }
}

// ---------------------------------------------------------------------------
// Generic crack feedback (ice layers, chain→cage transition)
// ---------------------------------------------------------------------------

function handleGenericCrack(
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    if (!cell) continue;
    shakeElement(cell, 2, 80);
  }
}

// ---------------------------------------------------------------------------
// Fast obstacle pop — ice/cage/safe(second hit) all do the 200ms shrink
// ---------------------------------------------------------------------------

function handleFastObstaclePop(
  event: JuiceEvent,
  cellMap: PixiCellMap,
): void {
  for (const pos of event.positions ?? []) {
    const cell = cellMap.getCellContainer(pos.col, pos.row);
    if (!cell) continue;

    gsap.killTweensOf(cell);
    gsap.killTweensOf(cell.scale);
    gsap.to(cell, { alpha: 0, duration: 0.2, ease: 'power2.in' });
    gsap.to(cell.scale, { x: 0, y: 0, duration: 0.2, ease: 'back.in(2)' });
  }
}

// ---------------------------------------------------------------------------
// Level end
// ---------------------------------------------------------------------------

function handleLevelWon(
  stage: Container,
  grid: Container,
  stageWidth: number,
): void {
  spawnConfetti(stage, 60, CONFETTI_PALETTE, 1500, stageWidth);
  screenShake(grid, 5, 200);
  zoomPunch(grid, 1.03, 200);
  colorFlash(stage, 0xffd54f, 0.15, 200);
}

function handleLevelLost(stage: Container, stageWidth: number): void {
  colorFlash(stage, 0x0d0d1f, 0.3, 400, stageWidth);
}
