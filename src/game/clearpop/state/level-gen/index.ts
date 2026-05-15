/**
 * Level Generation — Pipeline Entry Point
 *
 * Assembles passes based on level config, runs pocket-first pipeline,
 * falls back to random-mask pipeline, then last-resort board.
 */

import type { BoardState } from '../types';
import { BLOCK_COLORS, OBSTACLE_MAX_HP } from '../types';
import { createSeededRNG } from '../seeded-rng';
import { createEmptyBoard, getCellById, setCellById } from '../board-state';
import { cellIdOf } from '../../topologies/rect-orth-down';
import type { Topology } from '../../contracts/topology';
import { generateTopologyLevel } from './topology-level-gen';
import type { LevelGenConfig, LevelGenPass } from './types';
import { runPipeline } from './pipeline';
import { buildRandomMask } from './mask/random-mask';
import { validateMaskLoose } from './mask/mask-validation';

import { buildPocketMaskPass } from './passes/build-pocket-mask';
import { placeBubblesPass } from './passes/place-bubbles';
import { colorGemsPass } from './passes/color-gems';
import { mirrorSymmetryPass } from './passes/mirror-symmetry';
import { placeEggsPass } from './passes/place-eggs';
import { placeIcePass } from './passes/place-ice';
import { placeJellyPass } from './passes/place-jelly';
import { placeCagesPass } from './passes/place-cages';
import { placeSafesPass } from './passes/place-safes';
import { placeCookiesPass } from './passes/place-cookies';
import { placeStonesPass } from './passes/place-stones';
import { placeBottomBlockerZonePass } from './passes/place-bottom-blocker-zone';
import { validateBoardPass } from './passes/validate-board';

export type { LevelGenConfig } from './types';

function buildPocketPassList(config: LevelGenConfig): LevelGenPass[] {
  const passes: LevelGenPass[] = [
    buildPocketMaskPass,
    placeBubblesPass,
    colorGemsPass,
  ];

  // Bottom blocker zone claims its rows before scatter passes run,
  // so jelly/cage/etc. won't fight over the same cells.
  if (config.bottomBlockerZone) passes.push(placeBottomBlockerZonePass);

  if (config.obstacleTypes.includes('egg'))    passes.push(placeEggsPass);
  if (config.obstacleTypes.includes('cookie')) passes.push(placeCookiesPass);
  if (config.obstacleTypes.includes('jelly'))  passes.push(placeJellyPass);
  if (config.obstacleTypes.includes('cage'))   passes.push(placeCagesPass);
  if (config.obstacleTypes.includes('safe'))   passes.push(placeSafesPass);

  passes.push(mirrorSymmetryPass);
  passes.push(validateBoardPass);
  return passes;
}

function buildRandomPassList(config: LevelGenConfig): LevelGenPass[] {
  const randomMaskPass: LevelGenPass = (ctx) => {
    const coverage = 0.55 + ctx.rng.next() * 0.25;
    const mask = buildRandomMask(config.cols, config.rows, ctx.rng, coverage);
    if (!validateMaskLoose(mask, config.cols, config.rows)) return null;
    ctx.mask = mask;
    return ctx;
  };

  const passes: LevelGenPass[] = [
    randomMaskPass,
    placeBubblesPass,
    colorGemsPass,
  ];

  if (config.bottomBlockerZone) passes.push(placeBottomBlockerZonePass);

  if (config.obstacleTypes.includes('egg'))    passes.push(placeEggsPass);
  if (config.obstacleTypes.includes('cookie')) passes.push(placeCookiesPass);
  if (config.obstacleTypes.includes('jelly'))  passes.push(placeJellyPass);
  if (config.obstacleTypes.includes('cage'))   passes.push(placeCagesPass);
  if (config.obstacleTypes.includes('safe'))   passes.push(placeSafesPass);

  passes.push(mirrorSymmetryPass);
  passes.push(validateBoardPass);
  return passes;
}

function createLastResortBoard(config: LevelGenConfig): BoardState {
  const rng = createSeededRNG(config.seed + 99999);
  const palette = BLOCK_COLORS.slice(0, config.colorCount);
  const board = createEmptyBoard(config.cols, config.rows);
  const half = Math.floor(config.cols / 2);

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      setCellById(board, cellIdOf(r, c), { kind: 'block', color: rng.pick(palette) });
    }
    for (let c = 0; c < half; c++) {
      const src = getCellById(board, cellIdOf(r, c));
      if (src) setCellById(board, cellIdOf(r, config.cols - 1 - c), { ...src });
    }
  }

  return board;
}

export function generateLevel(config: LevelGenConfig, topology?: Topology): BoardState {
  // Non-rect topologies (hex-down, radial-in, future) use the generic
  // topology-aware generator. The rect pipeline encodes rect-specific
  // aesthetics that don't translate to hex/radial layouts.
  if (topology && topology.id !== 'rect-orth-down') {
    return generateTopologyLevel(config, topology);
  }

  const pocketPasses = buildPocketPassList(config);
  const pocketResult = runPipeline(pocketPasses, config, 32);
  if (pocketResult) return pocketResult;

  const randomPasses = buildRandomPassList(config);
  const randomResult = runPipeline(randomPasses, config, 40);
  if (randomResult) return randomResult;

  return createLastResortBoard(config);
}
