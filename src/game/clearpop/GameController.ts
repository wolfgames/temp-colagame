/**
 * ClearPop Game Controller
 *
 * Thin orchestrator: creates Pixi Application, sets up scene layers,
 * wires state to renderers, drives the tap->pop->gravity->refill loop.
 */

import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { createSignal, createEffect } from 'solid-js';
import { audioState } from '~/core/systems/audio';
import gsap from 'gsap';

import type { GameControllerDeps, GameController } from '~/game/mygame-contract';
import type { GameTuning } from '~/game/tuning';
import { gameState } from '~/game/state';

import { createSeededRNG } from './state/seeded-rng';
import type { SeededRNG } from './state/seeded-rng';
import { getCell } from './state/board-state';
import { findGroup, hasValidGroups } from './state/game-logic';
import type { BoardState, BlockColor, GridPos, LevelConfig, ObstacleType, FallMovement } from './state/types';
import type { ComboType } from './state/powerup-logic';
import type { Topology } from './contracts/topology';
import { createRectOrthDownTopology } from './topologies/rect-orth-down';

import { BoardRenderer } from './renderers/board-renderer';
import { HudRenderer } from './renderers/hud-renderer';
import { loadSpriteAssets } from './renderers/sprite-assets';

import { animatePop } from './animations/pop';
import { animateGravity, animateRefill } from './animations/gravity';
import { processPixiJuice, type PixiCellMap, type JuiceEvent } from './juice';
import { spawnConfetti, setPopcornTextures, getPopcornTextures, setFireTextures, getFireTextures } from './juice/pixi-particles';
import {
  animateRocketDetonation,
  animateBombDetonation,
  animateColorBurstDetonation,
  animateColorBlastPrelude,
  animatePopcornRocketPrelude,
  animateKernelPopPrelude,
  animateComboOrbit,
  animateComboDetonation,
  animateBombColorblastCombo,
  animateRocketColorblastCombo,
} from './animations/powerup';
import { attachLevelNavDebug } from './debug/level-nav';
import { GameAudioManager } from '~/game/audio/manager';
import { createSoundBankFromTheme } from '~/game/audio/sound-bank';

import { createTalkingHeads } from './ui/TalkingHeads';
import { createTalkingHeadsPixi, type TalkingHeadsPixiController } from './ui/TalkingHeads-pixi';
import type { Variant } from './contracts/variant';
import {
  getLevelZone,
  isZoneFirstLevel,
  isZoneLastLevel,
  findZoneContent,
  getZoneIntro,
  getLevelQuip,
  getCompanionSpeaker,
} from './themes/zone-helpers';
import {
  getBlockerQuip as themeBlockerQuip,
  getRecipeForBlockers as themeRecipeForBlockers,
  getIntroCompanionImages,
} from './themes/theme-helpers';
import { createInterstitial } from './ui/Interstitial';
import { createZoneInterstitial } from './ui/ZoneInterstitial';
import { createZoneInterstitialPixi } from './ui/ZoneInterstitial-pixi';
import { createIntroInterstitial } from './ui/IntroInterstitial';
import { createIntroInterstitialPixi } from './ui/IntroInterstitial-pixi';
import { createSectionInterstitialPixi } from './ui/SectionInterstitial-pixi';
import { getAvailableObstacles } from './state/obstacle-logic';

import { Database } from '@adobe/data/ecs';
import { setActiveDb } from '~/core/systems/ecs';
import { clearpopPlugin, readBoardFromEcs, bridgeEcsToSignals, setActiveTopology, type ClearpopDatabase } from './ClearpopPlugin';

export function createGameController(deps: GameControllerDeps, variant: Variant): GameController {
  const theme = variant.theme;
  const strings = theme.strings;
  const companionSpeaker = getCompanionSpeaker(theme.companion);
  // Speaker key is fixed to 'nana' (the UI dialogue convention). When the
  // theme contract grows a `companion.speakerKey` field, replace this.
  const companionKey = 'nana';
  // Theme-agnostic per-blocker helpers — themes that don't ship quips or
  // recipe sections fall through to null / theme.fallbackRecipe.
  const safeBlockerQuip = (types: import('./state/types').ObstacleType[], level: number) =>
    themeBlockerQuip(theme, types, level);
  const safeRecipeForBlockers = (types: import('./state/types').ObstacleType[]) =>
    themeRecipeForBlockers(theme, types);

  const [ariaText, setAriaText] = createSignal<string>(strings.hud.ariaLoading);
  const tuning = deps.tuning.game as GameTuning;
  const analytics = deps.analytics;

  let app: Application | null = null;
  let domContainer: HTMLDivElement | null = null;
  let ecsDb: ClearpopDatabase | null = null;
  let cleanupObserve: (() => void) | null = null;
  let boardRenderer: BoardRenderer | null = null;
  let hudRenderer: HudRenderer | null = null;
  let board: BoardState | null = null;
  // Topology comes from the variant — set once on init and used everywhere.
  // The plugin reads its own copy via `setActiveTopology`; this local mirror
  // is the one passed into kernel functions (findGroup, hasValidGroups, etc.)
  // and renderer methods that take a topology argument.
  let topology: Topology = variant.topology;
  setActiveTopology(variant.topology);
  let rng: SeededRNG = createSeededRNG(Date.now());
  const gotoScreen = deps.goto ?? null;
  let cleanupDebug: (() => void) | null = null;
  let currentTalkingHeads: TalkingHeadsPixiController | null = null;
  let logoTexture: Texture | null = null;
  let bgSprite: Sprite | null = null;
  // Per-zone background textures (theme.background.perZone). Empty when the
  // theme doesn't declare zone-specific art — the main `background` texture
  // covers every zone in that case.
  let perZoneBackgrounds: Map<number, import('pixi.js').Texture> = new Map();
  let baseBackgroundTexture: import('pixi.js').Texture | null = null;
  let lastBgZone: number | null = null;
  // Build the sound bank from the theme's declared SoundRefs. Themes that
  // ship their own audio bundles supply `audio.bundles`; otherwise events
  // fall back to the canonical eigenpop bundle (which only plays audibly
  // when the sprite names also match — see `audio/sounds.ts`).
  const soundBank = createSoundBankFromTheme(theme.audio);
  const audio = new GameAudioManager(deps.coordinator.audio, soundBank);
  let musicStarted = false;

  createEffect(() => {
    const enabled = audioState.musicEnabled();
    if (!musicStarted) return;
    if (enabled) {
      if (audio.isMusicPaused()) {
        audio.resumeMusic();
      } else {
        audio.startGameMusic();
      }
    } else {
      audio.pauseMusic();
    }
  });

  // ── Analytics tracking state ──
  let levelStartTime = 0;
  let movesThisLevel = 0;
  let lastMoveTime = 0;
  let invalidTapsThisLevel = 0;
  let lastInvalidTapResponse = 0;
  let retryCountByLevel = new Map<number, number>();
  // Run lifecycle — set on init(), cleared on game_end fire.
  let runId = '';
  let runStartTime = 0;
  let gameEndFired = false;
  // Difficulty bands per ClearPop GDD: 1-30 easy, 31-100 medium, 101+ hard.
  function deriveDifficulty(levelOrder: number): 'easy' | 'medium' | 'hard' {
    if (levelOrder <= 30) return 'easy';
    if (levelOrder <= 100) return 'medium';
    return 'hard';
  }
  function fireGameEnd(state: 'exit' | 'abandoned' | 'error'): void {
    if (gameEndFired || !runId) return;
    gameEndFired = true;
    const finalLevel = ecsDb?.resources.level ?? 0;
    const runDuration = parseFloat(((Date.now() - runStartTime) / 1000).toFixed(2));
    analytics.trackGameEnd({
      run_id: runId,
      game_end_state: state,
      final_level_order: finalLevel,
      run_duration: runDuration,
    });
  }
  function handleBeforeUnload(): void {
    fireGameEnd('abandoned');
  }

  const bgLayer = new Container();
  const boardLayer = new Container();
  const hudLayer = new Container();
  const fxLayer = new Container();
  const overlayLayer = new Container();
  const interstitialLayer = new Container();

  bgLayer.eventMode = 'none';
  boardLayer.eventMode = 'passive';
  hudLayer.eventMode = 'passive';
  fxLayer.eventMode = 'none';
  overlayLayer.eventMode = 'none';
  overlayLayer.visible = false;
  interstitialLayer.eventMode = 'static';

  function fitBackground(w: number, h: number): void {
    if (!bgSprite) return;
    const scaleX = w / bgSprite.texture.width;
    const scaleY = h / bgSprite.texture.height;
    const scale = Math.max(scaleX, scaleY);
    bgSprite.scale.set(scale);
    bgSprite.x = (w - bgSprite.texture.width * scale) / 2;
    bgSprite.y = (h - bgSprite.texture.height * scale) / 2;
  }

  /**
   * Swap the background sprite to the texture matching the given zone.
   * Falls back to `baseBackgroundTexture` when the theme doesn't ship a
   * zone-specific asset. Re-runs `fitBackground` because the new texture
   * may have different dimensions.
   */
  function applyZoneBackground(zone: number): void {
    if (!bgSprite || !app) return;
    if (lastBgZone === zone) return;
    const next = perZoneBackgrounds.get(zone) ?? baseBackgroundTexture;
    if (!next || bgSprite.texture === next) {
      lastBgZone = zone;
      return;
    }
    bgSprite.texture = next;
    fitBackground(app.screen.width, app.screen.height);
    lastBgZone = zone;
  }

  // -----------------------------------------------------------------------
  // Juice (VFX feedback)
  // -----------------------------------------------------------------------

  function buildCellMap(): PixiCellMap {
    return {
      getCellCenter(col: number, row: number) {
        if (!boardRenderer) return null;
        const p = boardRenderer.gridToScreen(row, col);
        const l = boardRenderer.getLayout();
        return {
          x: boardRenderer.container.x + p.x + l.tileSize / 2,
          y: boardRenderer.container.y + p.y + l.tileSize / 2,
        };
      },
      getGroupCentroid(positions: GridPos[]) {
        if (!boardRenderer || positions.length === 0) return null;
        let sx = 0, sy = 0;
        let count = 0;
        for (const pos of positions) {
          const c = this.getCellCenter(pos.col, pos.row);
          if (c) { sx += c.x; sy += c.y; count++; }
        }
        return count > 0 ? { x: sx / count, y: sy / count } : null;
      },
      getCellContainer(col: number, row: number) {
        return boardRenderer?.getVisual(row, col)?.container
          ?? boardRenderer?.getObstacleContainerAt(row, col)
          ?? null;
      },
      getObstacleArt(col: number, row: number) {
        return boardRenderer?.getObstacleAt(row, col) ?? null;
      },
    };
  }

  function fireJuice(events: JuiceEvent[]): void {
    if (!app || !boardRenderer) return;
    processPixiJuice(fxLayer, boardRenderer.container, events, buildCellMap(), app.screen.width);
  }

  function buildObstacleJuice(
    oldBoard: BoardState,
    newBoard: BoardState,
    damagedPositions: GridPos[],
  ): JuiceEvent[] {
    const crackedByType = new Map<ObstacleType, GridPos[]>();
    const clearedByType = new Map<ObstacleType, GridPos[]>();

    for (const pos of damagedPositions) {
      const oldCell = getCell(oldBoard, pos.row, pos.col);
      if (!oldCell || oldCell.kind !== 'obstacle') continue;

      const newCell = getCell(newBoard, pos.row, pos.col);
      const wasCleared = !newCell || newCell.kind !== 'obstacle';
      const map = wasCleared ? clearedByType : crackedByType;

      if (!map.has(oldCell.obstacleType)) map.set(oldCell.obstacleType, []);
      map.get(oldCell.obstacleType)!.push(pos);
    }

    const events: JuiceEvent[] = [];
    for (const [obstacleType, positions] of crackedByType) {
      events.push({ type: 'obstacle_cracked', obstacleType, positions });
    }
    for (const [obstacleType, positions] of clearedByType) {
      events.push({ type: 'obstacle_cleared', obstacleType, positions });
    }
    return events;
  }



  /** Push current board layout into ECS so replaceBoard computes correct world positions. */
  function syncLayout(): void {
    if (!ecsDb || !boardRenderer) return;
    const l = boardRenderer.getLayout();
    ecsDb.transactions.setLayout({
      offsetX: boardRenderer.container.x,
      offsetY: boardRenderer.container.y,
      tileSize: l.tileSize,
      gap: l.gap,
      boardWidth: l.boardWidth,
      boardHeight: l.boardHeight,
    });
  }

  // -----------------------------------------------------------------------
  // Level Setup
  // -----------------------------------------------------------------------

  function startLevel(skipZoneIntro = false): void {
    rng = createSeededRNG(Date.now());

    syncLayout(); // push layout into ECS before initLevel calls replaceBoard
    const result = ecsDb!.actions.initLevel({ rng });
    board = result.board;
    gameState.setCurrentLevelConfig(result.config);

    if (boardRenderer && app) {
      gsap.killTweensOf(boardRenderer.container);
      gsap.killTweensOf(boardRenderer.container.scale);
      boardRenderer.container.scale.set(1);
      boardRenderer.container.rotation = 0;
      boardRenderer.resize(board!, app!.screen.width, app!.screen.height, 140, 80, topology);
      syncLayout();
      fitBackground(app!.screen.width, app!.screen.height);
      boardRenderer.animateBoardEntry(board!.rows, board!.cols);
      boardRenderer.highlightGroups(board!, 2, topology);
    }

    hudRenderer?.resetStarBar();
    syncHud();

    // Show Nana's dialogue on the first level of each zone, then announce goal.
    if (hudRenderer && app && ecsDb) {
      currentTalkingHeads?.destroy();
      currentTalkingHeads = null;

      ecsDb.transactions.setPhase('animating');

      // Hide the board while the dialogue overlay is on screen \u2014 the TalkingHeads
      // portrait + bubble + dish circle reaches ~160px from the bottom and would
      // otherwise visually overlap the bottom rows of the playfield. Faded back
      // in when the dialogue completes (just before announceGoal pops).
      gsap.killTweensOf(boardLayer);
      boardLayer.alpha = 0;

      const level = ecsDb.resources.level;
      const zone = getLevelZone(level);
      applyZoneBackground(zone);
      const isIntro = isZoneFirstLevel(level) && !skipZoneIntro;
      const blockerTypes = countBlockersByType().map(b => b.type);
      const steps = isIntro
        ? (getZoneIntro(theme.zones, zone) ?? [getLevelQuip(theme, level)])
        : [safeBlockerQuip(blockerTypes, level) ?? getLevelQuip(theme, level)];

      const revealBoard = (): Promise<void> =>
        new Promise(resolve => {
          gsap.to(boardLayer, {
            alpha: 1,
            duration: 0.35,
            ease: 'power2.out',
            onComplete: resolve,
          });
        });

      const afterDialogue = (): void => {
        revealBoard().then(() => {
          hudRenderer!.announceGoal(
            ecsDb!.resources.goalLabel,
            ecsDb!.resources.goalTarget,
            app!.screen.width,
            app!.screen.height,
          ).then(() => {
            ecsDb?.transactions.setPhase('idle');
          });
        });
      };

      currentTalkingHeads = createTalkingHeadsPixi(interstitialLayer, {
        width: app.screen.width,
        height: app.screen.height,
        steps,
        speakers: { [companionKey]: companionSpeaker },
        lastStepLabel: "LET'S BAKE \u203A",
        // Quips snap in without animation but always slide out
        skipEnterAnimation: !isIntro,
        skipExitAnimation: false,
        dishImage: isIntro ? (findZoneContent(theme.zones, zone)?.dishImage ?? undefined) : undefined,
        onComplete: () => {
          currentTalkingHeads?.destroy();
          currentTalkingHeads = null;
          afterDialogue();
        },
      });
    } else {
      boardLayer.alpha = 1;
      ecsDb!.transactions.setPhase('idle');
    }

    setAriaText(`Level ${result.config.levelId}. ${result.config.moves} moves. Tap matching blocks to clear them.`);

    // ── Analytics: level_start ──
    levelStartTime = Date.now();
    movesThisLevel = 0;
    lastMoveTime = levelStartTime;
    invalidTapsThisLevel = 0;
    lastInvalidTapResponse = 0;
    const levelOrder = ecsDb!.resources.level;
    const retryCount = retryCountByLevel.get(levelOrder) ?? 0;
    analytics.trackLevelStart({
      level_id: String(result.config.levelId),
      level_order: levelOrder,
      level_difficulty: deriveDifficulty(levelOrder),
      is_retry: retryCount > 0,
      retry_count: retryCount,
    });
  }

  function syncHud(): void {
    if (!hudRenderer || !ecsDb) return;
    hudRenderer.updateLevel(ecsDb.resources.level);
    hudRenderer.updateGoalBlockers(countBlockersByType());
    hudRenderer.updateMoves(ecsDb.resources.movesRemaining);
    const score = ecsDb.resources.score;
    const thresholds = ecsDb.resources.starThresholds as [number, number, number];
    const maxThreshold = thresholds[2] || 3000;
    const progress = Math.min(1, score / maxThreshold);
    hudRenderer.updateStars(ecsDb.resources.starsEarned, progress);
  }

  function countBlockersByType(): Array<{ type: import('./state/types').ObstacleType; count: number }> {
    if (!board) return [];
    const counts = new Map<import('./state/types').ObstacleType, number>();
    // Iterate cellsById directly — non-rect topologies (radial-in, hex-down)
    // use cell IDs that don't decompose into row,col pairs.
    for (const cell of board.cellsById.values()) {
      if (cell.kind === 'obstacle') {
        const key = cell.obstacleType;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }

  function getGoalProgress(): number {
    if (!ecsDb) return 0;
    return ecsDb.resources.goalTarget - ecsDb.resources.blockerCount;
  }

  function checkGoalComplete(): boolean {
    if (!ecsDb) return false;
    return ecsDb.resources.goalTarget > 0 && ecsDb.resources.blockerCount === 0;
  }

  /**
   * Shared end-of-turn resolution. Called after every move (tap or power-up).
   * Order matters: win check first, then moves-exhausted loss, then dead-board loss.
   */
  function resolveEndOfTurn(): void {
    if (!ecsDb || !board || !boardRenderer) return;

    if (checkGoalComplete()) {
      ecsDb.transactions.setPhase('won');
      fireJuice([{ type: 'level_won' }]);
      audio.playWin();
      setAriaText(`Level complete! Score: ${ecsDb.resources.score}. Stars: ${ecsDb.resources.starsEarned}.`);

      // ── Analytics: level_complete + invalid_tap_summary ──
      const winLevel = ecsDb.resources.level;
      const winDuration = parseFloat(((Date.now() - levelStartTime) / 1000).toFixed(2));
      analytics.trackLevelComplete({
        level_id: String(winLevel),
        level_order: winLevel,
        level_difficulty: deriveDifficulty(winLevel),
        level_score: ecsDb.resources.score,
        level_duration: winDuration,
        stars_earned: ecsDb.resources.starsEarned,
        total_moves_made: movesThisLevel,
      });
      if (invalidTapsThisLevel > 0) {
        analytics.trackInvalidTapSummary({
          level_id: String(winLevel),
          count: invalidTapsThisLevel,
          last_response_time: lastInvalidTapResponse,
        });
      }
      retryCountByLevel.delete(winLevel);
      gsap.delayedCall(1.0, () => { showResultsOverlay(true); });
      return;
    }

    if (ecsDb.resources.movesRemaining === 0) {
      ecsDb.transactions.setPhase('lost');
      fireJuice([{ type: 'level_lost' }]);
      audio.playLose();
      setAriaText(strings.hud.ariaOutOfMoves);

      // ── Analytics: level_fail (moves_exhausted) ──
      const failLevel = ecsDb.resources.level;
      const failDuration = parseFloat(((Date.now() - levelStartTime) / 1000).toFixed(2));
      analytics.trackLevelFail({
        level_id: String(failLevel),
        level_order: failLevel,
        level_difficulty: deriveDifficulty(failLevel),
        fail_reason: 'moves_exhausted',
        level_duration: failDuration,
        total_moves_made: movesThisLevel,
      });
      if (invalidTapsThisLevel > 0) {
        analytics.trackInvalidTapSummary({
          level_id: String(failLevel),
          count: invalidTapsThisLevel,
          last_response_time: lastInvalidTapResponse,
        });
      }
      retryCountByLevel.set(failLevel, (retryCountByLevel.get(failLevel) ?? 0) + 1);

      gsap.delayedCall(1.0, () => showResultsOverlay(false));
      return;
    }

    if (!hasValidGroups(board, topology ?? undefined)) {
      ecsDb.transactions.setPhase('lost');
      fireJuice([{ type: 'level_lost' }]);
      audio.playLose();
      setAriaText('No valid moves!');

      // ── Analytics: board_blocked + level_fail (board_blocked) ──
      const blockedLevel = ecsDb.resources.level;
      const blockedDuration = parseFloat(((Date.now() - levelStartTime) / 1000).toFixed(2));
      analytics.trackBoardBlocked({
        level_id: String(blockedLevel),
        move_order: movesThisLevel,
      });
      analytics.trackLevelFail({
        level_id: String(blockedLevel),
        level_order: blockedLevel,
        level_difficulty: deriveDifficulty(blockedLevel),
        fail_reason: 'board_blocked',
        level_duration: blockedDuration,
        total_moves_made: movesThisLevel,
      });
      if (invalidTapsThisLevel > 0) {
        analytics.trackInvalidTapSummary({
          level_id: String(blockedLevel),
          count: invalidTapsThisLevel,
          last_response_time: lastInvalidTapResponse,
        });
      }
      retryCountByLevel.set(blockedLevel, (retryCountByLevel.get(blockedLevel) ?? 0) + 1);

      gsap.delayedCall(1.0, () => showResultsOverlay(false));
      return;
    }

    boardRenderer.highlightGroups(board, 2, topology ?? undefined);
    ecsDb.transactions.setPhase('idle');
  }

  // -----------------------------------------------------------------------
  // Results Overlay (Pixi, on top of game)
  // -----------------------------------------------------------------------

  const CONFETTI_COLORS = [0xb44ac0, 0xe63946, 0xf4a236, 0x4caf50, 0x3d5afe, 0xffd700, 0xff6b9d, 0x00c9a7];

  function spawnConfettiBurst(
    parent: Container,
    count: number,
    palette: number[],
    stageW: number,
    stageH: number,
    fromBottom: boolean,
    delayMs = 0,
  ): void {
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const p = new Graphics();
      const pw = 5 + Math.random() * 6;
      const ph = 3 + Math.random() * 4;
      p.rect(-pw / 2, -ph / 2, pw, ph).fill(color);
      p.x = Math.random() * stageW;
      p.y = fromBottom ? stageH + 10 : -10;
      p.rotation = Math.random() * Math.PI;
      parent.addChild(p);

      const travel = 400 + Math.random() * 500;
      const sway = (Math.random() - 0.5) * 160;
      const targetY = fromBottom ? p.y - travel : p.y + travel;

      gsap.to(p, {
        y: targetY,
        x: p.x + sway,
        rotation: p.rotation + Math.PI * (2 + Math.random() * 4),
        alpha: 0,
        duration: 1.8 + Math.random() * 0.8,
        ease: fromBottom ? 'power2.out' : 'power1.in',
        delay: delayMs / 1000 + Math.random() * 0.4,
        onComplete: () => {
          p.parent?.removeChild(p);
          p.destroy();
        },
      });
    }
  }

  function showResultsOverlay(won: boolean): void {
    if (!app || !ecsDb) return;
    const w = app.screen.width;
    const h = app.screen.height;

    overlayLayer.removeChildren();

    // Dark fade background
    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: 0x000000, alpha: 0.7 });
    bg.eventMode = 'static';
    overlayLayer.addChild(bg);

    // Logo (win only) — scale-up from zero
    let logoSprite: Sprite | null = null;
    if (won && logoTexture) {
      logoSprite = new Sprite(logoTexture);
      logoSprite.anchor.set(0.5);
      logoSprite.position.set(w / 2, h * 0.28);
      const logoTargetW = Math.min(w * 0.65, 300);
      const logoScale = logoTargetW / logoTexture.width;
      logoSprite.scale.set(0);
      logoSprite.alpha = 0;
      overlayLayer.addChild(logoSprite);
      (logoSprite as any)._targetScale = logoScale;
    }

    // Title
    const title = new Text({
      text: won ? strings.win.title : strings.loss.title,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 36, fontWeight: '700' as const, fill: 0xffffff },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, won ? h * 0.42 : h * 0.35);
    title.alpha = 0;
    title.scale.set(0.5);
    overlayLayer.addChild(title);

    // Stars
    const starCount = ecsDb!.resources.starsEarned;
    const starText = new Text({
      text: '\u2605'.repeat(starCount) + '\u2606'.repeat(3 - starCount),
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 48, fill: 0xffd700 },
    });
    starText.anchor.set(0.5);
    starText.position.set(w / 2, won ? h * 0.50 : h * 0.45);
    starText.alpha = 0;
    overlayLayer.addChild(starText);

    // Score
    const scoreLabel = new Text({
      text: `Score: ${ecsDb!.resources.score}`,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 24, fontWeight: '600' as const, fill: 0xffffff },
    });
    scoreLabel.anchor.set(0.5);
    scoreLabel.position.set(w / 2, won ? h * 0.57 : h * 0.55);
    scoreLabel.alpha = 0;
    overlayLayer.addChild(scoreLabel);

    // Buttons
    const btnY = won ? h * 0.70 : h * 0.68;
    const btnW = 160;
    const btnH = 50;
    const btnGap = 20;

    function createButton(label: string, x: number, color: number, onTap: () => void): Container {
      const btn = new Container();
      btn.position.set(x, btnY);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      const btnBg = new Graphics();
      btnBg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      btnBg.fill(color);
      btn.addChild(btnBg);

      const btnText = new Text({
        text: label,
        style: { fontFamily: 'system-ui, sans-serif', fontSize: 18, fontWeight: '600' as const, fill: 0xffffff },
      });
      btnText.anchor.set(0.5);
      btn.addChild(btnText);

      btn.alpha = 0;
      btn.scale.set(0.8);

      btn.on('pointerover', () => gsap.to(btn.scale, { x: 1.05, y: 1.05, duration: 0.1 }));
      btn.on('pointerout', () => gsap.to(btn.scale, { x: 1, y: 1, duration: 0.1 }));
      btn.on('pointertap', onTap);

      overlayLayer.addChild(btn);
      return btn;
    }

    const primaryBtn = won
      ? createButton(strings.win.nextLevel, w / 2 - (btnW / 2 + btnGap / 2), 0x4a8c1c, () => {
          hideResultsOverlay();
          const completedLevel = ecsDb!.resources.level;
          ecsDb!.transactions.incrementLevel();
          const nextLevel = ecsDb!.resources.level;

          const isZoneComplete = completedLevel % 10 === 0;

          if (isZoneComplete && app) {
            const completedRecipe = safeRecipeForBlockers(getAvailableObstacles(completedLevel));
            const completedZone = getLevelZone(completedLevel);
            const zoneContent = {
              zone: completedZone,
              orderName: '',
              dishName: completedRecipe.dishName,
              dishImage: completedRecipe.dishImage,
              nanaClosingLine: completedRecipe.nanaClosingLine,
              introDialogue: [],
              quips: [],
            };
            const zi = createZoneInterstitialPixi(interstitialLayer, {
              width: app.screen.width,
              height: app.screen.height,
              content: zoneContent,
              onComplete: () => {
                zi.destroy();
                if (!app) return;
                const nextBlockers = getAvailableObstacles(nextLevel);
                const recipe = safeRecipeForBlockers(nextBlockers);
                const si = createSectionInterstitialPixi(interstitialLayer, {
                  width: app.screen.width,
                  height: app.screen.height,
                  recipe,
                  blockers: nextBlockers,
                  blockerDisplayNames: theme.blockerDisplayNames,
                  companionPortrait: theme.companion.spriteKeys.idle,
                  onComplete: () => { si.destroy(); startLevel(); },
                });
              },
            });
          } else {
            startLevel();
          }
        })
      : createButton('Retry', w / 2 - (btnW / 2 + btnGap / 2), 0xe63946, () => {
          hideResultsOverlay();
          startLevel();
        });

    const menuBtn = createButton('Main Menu', w / 2 + (btnW / 2 + btnGap / 2), 0x555555, () => {
      hideResultsOverlay();
      fireGameEnd('exit');
      gotoScreen?.('start');
    });

    // Entrance animations
    overlayLayer.visible = true;
    overlayLayer.eventMode = 'static';
    bg.alpha = 0;
    gsap.to(bg, { alpha: 0.7, duration: 0.4, ease: 'power2.out' });

    if (logoSprite) {
      const ts = (logoSprite as any)._targetScale as number;
      gsap.to(logoSprite, { alpha: 1, duration: 0.5, delay: 0.1, ease: 'power2.out' });
      gsap.to(logoSprite.scale, { x: ts, y: ts, duration: 0.6, delay: 0.1, ease: 'back.out(1.7)' });

      // Confetti from top and bottom simultaneously
      spawnConfettiBurst(overlayLayer, 50, CONFETTI_COLORS, w, h, false, 0);
      spawnConfettiBurst(overlayLayer, 50, CONFETTI_COLORS, w, h, true, 0);
      // Second wave for extra celebration
      spawnConfettiBurst(overlayLayer, 35, CONFETTI_COLORS, w, h, false, 400);
      spawnConfettiBurst(overlayLayer, 35, CONFETTI_COLORS, w, h, true, 400);
    }

    const textDelay = won ? 0.35 : 0.15;
    gsap.to(title, { alpha: 1, duration: 0.4, delay: textDelay, ease: 'power2.out' });
    gsap.to(title.scale, { x: 1, y: 1, duration: 0.4, delay: textDelay, ease: 'back.out(1.5)' });
    gsap.to(starText, { alpha: 1, duration: 0.3, delay: textDelay + 0.15, ease: 'power2.out' });
    gsap.to(scoreLabel, { alpha: 1, duration: 0.3, delay: textDelay + 0.25, ease: 'power2.out' });
    gsap.to(primaryBtn, { alpha: 1, duration: 0.3, delay: textDelay + 0.35, ease: 'power2.out' });
    gsap.to(primaryBtn.scale, { x: 1, y: 1, duration: 0.3, delay: textDelay + 0.35, ease: 'back.out(1.3)' });
    gsap.to(menuBtn, { alpha: 1, duration: 0.3, delay: textDelay + 0.4, ease: 'power2.out' });
    gsap.to(menuBtn.scale, { x: 1, y: 1, duration: 0.3, delay: textDelay + 0.4, ease: 'back.out(1.3)' });
  }

  function hideResultsOverlay(): void {
    // Kill all tweens on overlay children
    for (let i = 0; i < overlayLayer.children.length; i++) {
      gsap.killTweensOf(overlayLayer.children[i]);
      gsap.killTweensOf(overlayLayer.children[i].scale);
    }
    overlayLayer.removeChildren();
    overlayLayer.visible = false;
    overlayLayer.eventMode = 'none';
  }

  // -----------------------------------------------------------------------
  // Core Gameplay Loop
  // -----------------------------------------------------------------------

  async function handleTap(pos: GridPos): Promise<void> {
    if (ecsDb!.resources.phase !== 'idle' || !boardRenderer) return;

    // Read current board from ECS (source of truth)
    board = readBoardFromEcs(ecsDb!, ecsDb!.resources.boardCols, ecsDb!.resources.boardRows);
    if (!board) return;

    const tappedCell = getCell(board, pos.row, pos.col);

    if (tappedCell?.kind === 'powerup') {
      await handlePowerUpTap(pos);
      return;
    }

    // Pre-check: is this a valid group?
    const group = findGroup(board, pos.row, pos.col, topology ?? undefined);
    if (group.length < 2) {
      fireJuice([{ type: 'invalid_tap', positions: [pos] }]);
      audio.playReject();
      // ── Analytics: invalid taps batched per level (fired in resolveEndOfTurn) ──
      invalidTapsThisLevel++;
      lastInvalidTapResponse = parseFloat(((Date.now() - lastMoveTime) / 1000).toFixed(2));
      return;
    }

    ecsDb!.transactions.setPhase('animating');
    boardRenderer.clearHighlights();

    // Execute turn logic via ECS action — returns animation metadata
    const result = ecsDb!.actions.executeTap({ row: pos.row, col: pos.col, rng });
    if (!result) { ecsDb!.transactions.setPhase('idle'); return; }

    syncHud();

    // ── Analytics: move_made + powerup_generated ──
    const now = Date.now();
    movesThisLevel++;
    const responseTime = parseFloat(((now - lastMoveTime) / 1000).toFixed(2));
    lastMoveTime = now;
    const moveLevelId = String(ecsDb!.resources.level);
    analytics.trackMoveMade({
      level_id: moveLevelId,
      move_order: movesThisLevel,
      move_type: 'group_clear',
      group_size: result.group.length,
      score_earned: result.score,
      response_time: responseTime,
      cell_type: result.blockColor,
    });
    if (result.spawnedPowerUp) {
      analytics.trackPowerupGenerated({
        level_id: moveLevelId,
        move_order: movesThisLevel,
        powerup_type: result.spawnedPowerUp as 'rocket' | 'bomb' | 'color_blast',
        trigger_group_size: result.group.length,
      });
    }

    // ── Animate using metadata from the action ──
    try {
      const visuals = result.group
        .map((p: GridPos) => boardRenderer!.getVisual(p.row, p.col))
        .filter((v: unknown): v is NonNullable<typeof v> => v !== null);

      fireJuice([{
        type: 'group_cleared',
        positions: result.group,
        blockColor: result.blockColor,
        scoreDelta: result.score,
      }]);
      audio.playPop();

      await animatePop(visuals);

      for (const p of result.group) {
        boardRenderer.setVisual(p.row, p.col, null);
      }

      // Shake damaged obstacles, then swap to cracked sprite
      if (result.obstaclesDamaged && result.obstaclesDamaged.length > 0) {
        const hasDestroyed = result.obstaclesDamaged.some((d: { destroyed: boolean }) => d.destroyed);
        if (hasDestroyed) audio.playBlockerClear();
        else audio.playBlockerHit();

        const shakePromises: Promise<void>[] = [];
        const deg = Math.PI / 90; // 2 degrees
        for (const dmg of result.obstaclesDamaged) {
          const obstacleSprite = boardRenderer.getObstacleSpriteAt(dmg.pos.row, dmg.pos.col);
          if (obstacleSprite) {
            const origX = obstacleSprite.x;
            const origRot = obstacleSprite.rotation;
            shakePromises.push(
              new Promise<void>((resolve) => {
                const tl = gsap.timeline({ onComplete: () => {
                  obstacleSprite.x = origX;
                  obstacleSprite.rotation = origRot;
                  if (dmg.destroyed) {
                    boardRenderer!.removeObstacleAt(dmg.pos.row, dmg.pos.col);
                    if (dmg.revealedObstacle) {
                      boardRenderer!.addObstacleAt(
                        dmg.revealedObstacle.obstacleType,
                        dmg.revealedObstacle.hp,
                        dmg.pos.row,
                        dmg.pos.col,
                      );
                    }
                  } else {
                    boardRenderer!.replaceObstacleAt(dmg.pos.row, dmg.pos.col, dmg.obstacleType, dmg.newHp);
                  }
                  resolve();
                }});
                if (dmg.destroyed && dmg.obstacleType === 'marshmallow') {
                  boardRenderer!.swapObstacleTexture(dmg.pos.row, dmg.pos.col, 'marshmallow_toasted');
                }
                tl.to(obstacleSprite, { x: origX + 3, rotation: deg, duration: 0.035, ease: 'none' });
                tl.to(obstacleSprite, { x: origX - 3, rotation: -deg, duration: 0.035, ease: 'none' });
                tl.to(obstacleSprite, { x: origX + 2, rotation: deg * 0.6, duration: 0.035, ease: 'none' });
                tl.to(obstacleSprite, { x: origX - 2, rotation: -deg * 0.6, duration: 0.035, ease: 'none' });
                tl.to(obstacleSprite, { x: origX + 1, rotation: deg * 0.3, duration: 0.03, ease: 'none' });
                tl.to(obstacleSprite, { x: origX, rotation: 0, duration: 0.03, ease: 'none' });
              }),
            );
          }
        }
        await Promise.all(shakePromises);

        const clearedByType = new Map<ObstacleType, GridPos[]>();
        for (const dmg of result.obstaclesDamaged) {
          if (!dmg.destroyed) continue;
          const list = clearedByType.get(dmg.obstacleType) ?? [];
          list.push(dmg.pos);
          clearedByType.set(dmg.obstacleType, list);
        }
        const clearedEvents: JuiceEvent[] = [];
        for (const [obstacleType, positions] of clearedByType) {
          clearedEvents.push({ type: 'obstacle_cleared', obstacleType, positions });
        }
        if (clearedEvents.length > 0) fireJuice(clearedEvents);
      }

      if (result.spawnedPowerUp) {
        boardRenderer.addPowerupAt(result.spawnedPowerUp, pos.row, pos.col, result.spawnedRocketDirection ?? undefined);
        fireJuice([{
          type: 'power_up_created',
          positions: [pos],
          blockColor: result.blockColor,
          powerUpType: result.spawnedPowerUp,
        }]);
        audio.playPowerUpSpawn();
      }

      if (result.spawnedObstacle) {
        boardRenderer.addObstacleAt('marshmallow', 1, result.spawnedObstacle.row, result.spawnedObstacle.col);
      }

      const gravityPromise = animateGravity(result.movements, boardRenderer);

      if (result.spawnedPowerUp) {
        const puMove = result.movements.find(
          (m: FallMovement) => m.from.row === pos.row && m.from.col === pos.col,
        );
        if (puMove) {
          const puSprite = boardRenderer.getPowerupSpriteAt(pos.row, pos.col);
          if (puSprite) {
            const target = boardRenderer.gridToScreen(puMove.to.row, puMove.to.col);
            const halfTile = boardRenderer.getLayout().tileSize / 2;
            gsap.to(puSprite, { y: target.y + halfTile, duration: 0.28, ease: 'back.out(1.4)' });
            boardRenderer.movePowerupSprite(pos.row, pos.col, puMove.to.row, puMove.to.col);
          }
        }
      }

      // Run gravity and refill concurrently: new cells start dropping from
      // above the board while existing blocks are still falling down. This
      // halves the wait from ~560ms (sequential) to ~280ms (parallel).
      await Promise.all([gravityPromise, animateRefill(result.refills, boardRenderer)]);
    } catch {
      /* animation failed — reconcile below */
    } finally {
      board = result.finalBoard;
      boardRenderer.syncBoard(board!);
    }

    syncHud();
    resolveEndOfTurn();
  }

  // -----------------------------------------------------------------------
  // Power-Up Tap
  // -----------------------------------------------------------------------

  async function handlePowerUpTap(pos: GridPos): Promise<void> {
    if (!boardRenderer || !ecsDb) return;

    board = readBoardFromEcs(ecsDb!, ecsDb!.resources.boardCols, ecsDb!.resources.boardRows);
    if (!board) return;

    const cell = getCell(board, pos.row, pos.col);
    if (!cell || cell.kind !== 'powerup') return;

    // ── Check for combo partner ──
    const combo = ecsDb!.actions.detectCombo({ row: pos.row, col: pos.col });
    if (combo) {
      await handleComboTap(pos, combo);
      return;
    }

    ecsDb!.transactions.setPhase('animating');
    boardRenderer.clearHighlights();

    const prevBoard = board;

    const result = ecsDb!.actions.executePowerUp({ row: pos.row, col: pos.col, rng });
    if (!result) { ecsDb!.transactions.setPhase('idle'); return; }

    syncHud();

    // ── Analytics: move_made (powerup_activation) ──
    const puNow = Date.now();
    movesThisLevel++;
    const puResponseTime = parseFloat(((puNow - lastMoveTime) / 1000).toFixed(2));
    lastMoveTime = puNow;
    analytics.trackMoveMade({
      level_id: String(ecsDb!.resources.level),
      move_order: movesThisLevel,
      move_type: 'powerup_activation',
      group_size: result.detonationResult.affectedCells.length,
      score_earned: result.score ?? 0,
      response_time: puResponseTime,
      powerup_type: cell.powerUpType as 'rocket' | 'bomb' | 'color_blast',
    });

    try {
      const rocketDir = cell.rocketDirection ?? 'right';

      if (cell.powerUpType === 'rocket') {
        await animatePopcornRocketPrelude(pos, boardRenderer, fxLayer, rocketDir);
      } else if (cell.powerUpType === 'bomb') {
        await animateKernelPopPrelude(pos, boardRenderer);
      } else if (cell.powerUpType !== 'color_blast') {
        boardRenderer.removePowerupAt(pos.row, pos.col);
      }

      const chainCellKeys = new Set<string>();
      for (const cr of result.detonationResult.chainReactions) {
        for (const ca of cr.affectedCells) chainCellKeys.add(`${ca.row},${ca.col}`);
        chainCellKeys.add(`${cr.pos.row},${cr.pos.col}`);
      }
      const initialAffected = result.detonationResult.affectedCells.filter(
        (p: GridPos) => !chainCellKeys.has(`${p.row},${p.col}`),
      );

      fireJuice([{
        type: 'power_up_detonated',
        powerUpType: cell.powerUpType,
        rocketDirection: cell.rocketDirection,
        positions: initialAffected,
        tapPosition: pos,
        blockColor: cell.color,
      }]);

      const isSoftBlocker = (type: ObstacleType) => type === 'marshmallow';
      const toastedKey = (_type: ObstacleType) => 'marshmallow_toasted';

      // Immediately swaps to the toasted texture, runs the same shake as the
      // normal match path, then removes or updates the sprite.
      const hitSoftBlocker = (hitPos: GridPos): Promise<void> => {
        if (!prevBoard) return Promise.resolve();
        const oldCell = getCell(prevBoard, hitPos.row, hitPos.col);
        if (!oldCell || oldCell.kind !== 'obstacle' || !isSoftBlocker(oldCell.obstacleType)) {
          return Promise.resolve();
        }
        boardRenderer!.swapObstacleTexture(hitPos.row, hitPos.col, toastedKey(oldCell.obstacleType));
        const sprite = boardRenderer!.getObstacleSpriteAt(hitPos.row, hitPos.col);
        if (!sprite) return Promise.resolve();

        const newCell = getCell(result.finalBoard, hitPos.row, hitPos.col);
        const destroyed = !newCell || newCell.kind !== 'obstacle';
        const newHp = !destroyed && newCell?.kind === 'obstacle' ? newCell.hp : 0;
        const origX = sprite.x;
        const origRot = sprite.rotation;
        const deg = Math.PI / 90;

        return new Promise<void>((resolve) => {
          const tl = gsap.timeline({
            onComplete: () => {
              sprite.x = origX;
              sprite.rotation = origRot;
              if (destroyed) boardRenderer!.removeObstacleAt(hitPos.row, hitPos.col);
              else boardRenderer!.replaceObstacleAt(hitPos.row, hitPos.col, oldCell.obstacleType, newHp);
              resolve();
            },
          });
          tl.to(sprite, { x: origX + 3, rotation: deg, duration: 0.035, ease: 'none' });
          tl.to(sprite, { x: origX - 3, rotation: -deg, duration: 0.035, ease: 'none' });
          tl.to(sprite, { x: origX + 2, rotation: deg * 0.6, duration: 0.035, ease: 'none' });
          tl.to(sprite, { x: origX - 2, rotation: -deg * 0.6, duration: 0.035, ease: 'none' });
          tl.to(sprite, { x: origX + 1, rotation: deg * 0.3, duration: 0.03, ease: 'none' });
          tl.to(sprite, { x: origX, rotation: 0, duration: 0.03, ease: 'none' });
        });
      };

      // Tracks positions already animating so duplicate entries in obstaclesDamaged
      // don't double-animate.
      const softBlockerHandled = new Set<string>();
      const scheduleSoftBlockerHit = (hitPos: GridPos, delaySeconds: number): Promise<void> => {
        const key = `${hitPos.row},${hitPos.col}`;
        if (softBlockerHandled.has(key)) return Promise.resolve();
        const oldCell = prevBoard ? getCell(prevBoard, hitPos.row, hitPos.col) : null;
        if (!oldCell || oldCell.kind !== 'obstacle' || !isSoftBlocker(oldCell.obstacleType)) {
          return Promise.resolve();
        }
        softBlockerHandled.add(key);
        if (delaySeconds <= 0) return hitSoftBlocker(hitPos);
        return new Promise<void>((resolve) => {
          gsap.delayedCall(delaySeconds, () => hitSoftBlocker(hitPos).then(resolve));
        });
      };

      switch (cell.powerUpType) {
        case 'rocket': {
          audio.playRocket();
          // Schedule each marshmallow reaction to fire at the same moment the
          // fire sweep reaches that tile (distance × 0.055 s — matches powerup.ts).
          const isHoriz = rocketDir === 'left' || rocketDir === 'right';
          const FIRE_DELAY = 0.055;
          const rocketSoftBlockerHits = result.obstaclesDamaged.map((mPos: GridPos) => {
            const tileDist = isHoriz
              ? Math.abs(mPos.col - pos.col)
              : Math.abs(mPos.row - pos.row);
            return scheduleSoftBlockerHit(mPos, tileDist * FIRE_DELAY);
          });
          await Promise.all([
            animateRocketDetonation(initialAffected, pos, boardRenderer, rocketDir, boardRenderer.getPowerupTexture('rocket'), fxLayer),
            ...rocketSoftBlockerHits,
          ]);
          break;
        }
        case 'bomb': {
          audio.playBomb();
          // Popcorn already flies to obstacle positions; react when each one lands.
          const bombSoftBlockerHits: Promise<void>[] = [];
          const bombAnimCells = [...initialAffected, ...result.obstaclesDamaged];
          await animateBombDetonation(
            bombAnimCells, pos, boardRenderer, fxLayer, getPopcornTextures(),
            (hitPos) => {
              const key = `${hitPos.row},${hitPos.col}`;
              if (!softBlockerHandled.has(key)) {
                softBlockerHandled.add(key);
                bombSoftBlockerHits.push(hitSoftBlocker(hitPos));
              }
            },
          );
          if (bombSoftBlockerHits.length > 0) await Promise.all(bombSoftBlockerHits);
          break;
        }
        case 'color_blast':
          audio.playColorBlast();
          await animateColorBlastPrelude(pos, boardRenderer, fxLayer);
          await animateColorBurstDetonation(initialAffected, pos, boardRenderer, fxLayer);
          break;
      }

      for (const p of initialAffected) {
        boardRenderer.setVisual(p.row, p.col, null);
      }

      for (const chain of result.detonationResult.chainReactions) {
        fireJuice([{
          type: 'power_up_detonated',
          powerUpType: chain.type,
          rocketDirection: chain.rocketDirection,
          positions: chain.affectedCells,
          tapPosition: chain.pos,
          blockColor: chain.color,
        }]);

        boardRenderer.removePowerupAt(chain.pos.row, chain.pos.col);

        switch (chain.type) {
          case 'rocket':
            await animateRocketDetonation(
              chain.affectedCells, chain.pos, boardRenderer, chain.rocketDirection ?? 'right',
              boardRenderer.getPowerupTexture('rocket'), fxLayer,
            );
            break;
          case 'bomb':
            await animateBombDetonation(chain.affectedCells, chain.pos, boardRenderer, fxLayer, getPopcornTextures());
            break;
          case 'color_blast':
            await animateColorBurstDetonation(chain.affectedCells, chain.pos, boardRenderer, fxLayer);
            break;
        }

        for (const p of chain.affectedCells) {
          boardRenderer.setVisual(p.row, p.col, null);
        }
      }

      // Handle any remaining soft-blocker hits not covered by the animations above
      // (adjacency-damaged blockers and color_blast indirect hits).
      {
        const remainingHits = result.obstaclesDamaged
          .map((p: GridPos) => scheduleSoftBlockerHit(p, 0));
        const live = remainingHits.filter(Boolean);
        if (live.length > 0) await Promise.all(live);
      }

      const puObstacleJuice = buildObstacleJuice(prevBoard!, result.finalBoard, result.obstaclesDamaged);
      if (puObstacleJuice.length > 0) fireJuice(puObstacleJuice);

      await Promise.all([
        animateGravity(result.movements, boardRenderer),
        animateRefill(result.refills, boardRenderer),
      ]);
    } catch {
      /* animation failed — reconcile below */
    } finally {
      board = result.finalBoard;
      boardRenderer.syncBoard(board!);
    }

    syncHud();
    resolveEndOfTurn();
  }

  // -----------------------------------------------------------------------
  // Combo Tap
  // -----------------------------------------------------------------------

  async function handleComboTap(
    pos: GridPos,
    combo: { pos: GridPos; powerUpType: string; comboType: string },
  ): Promise<void> {
    if (!boardRenderer || !ecsDb) return;

    ecsDb!.transactions.setPhase('animating');
    boardRenderer.clearHighlights();

    const prevBoard = board!;

    const spriteA = boardRenderer.detachPowerupSprite(pos.row, pos.col);
    const spriteB = boardRenderer.detachPowerupSprite(combo.pos.row, combo.pos.col);

    if (spriteA && spriteB) {
      const cellMap = buildCellMap();
      const cA = cellMap.getCellCenter(pos.col, pos.row);
      const cB = cellMap.getCellCenter(combo.pos.col, combo.pos.row);
      if (cA && cB) {
        await animateComboOrbit(spriteA, spriteB, fxLayer, cA, cB);
      } else {
        spriteA.parent?.removeChild(spriteA);
        spriteA.destroy({ children: true });
        spriteB.parent?.removeChild(spriteB);
        spriteB.destroy({ children: true });
      }
    } else {
      boardRenderer.removePowerupAt(pos.row, pos.col);
      boardRenderer.removePowerupAt(combo.pos.row, combo.pos.col);
    }

    // Execute the combo logic
    const result = ecsDb!.actions.executeComboAction({
      row: pos.row,
      col: pos.col,
      partnerRow: combo.pos.row,
      partnerCol: combo.pos.col,
      rng,
    });
    if (!result) { ecsDb!.transactions.setPhase('idle'); return; }

    syncHud();

    // ── Analytics: move_made (powerup_combo) — single event for both power-ups ──
    const comboNow = Date.now();
    movesThisLevel++;
    const comboResponseTime = parseFloat(((comboNow - lastMoveTime) / 1000).toFixed(2));
    lastMoveTime = comboNow;
    analytics.trackMoveMade({
      level_id: String(ecsDb!.resources.level),
      move_order: movesThisLevel,
      move_type: 'powerup_combo',
      group_size: result.comboResult.affectedCells.length,
      score_earned: result.score ?? 0,
      response_time: comboResponseTime,
      combo_pair: result.comboType,
    });

    try {
      const comboColor = (result.cellA as { color: string }).color as BlockColor;

      if (result.comboType === 'bomb_colorblast' && result.comboResult.bombColorblastTargets) {
        audio.playCombo();

        await animateBombColorblastCombo(
          pos,
          result.comboResult.bombColorblastTargets,
          boardRenderer,
          fxLayer,
          getPopcornTextures(),
          boardRenderer.getPowerupTexture('bomb'),
          (target) => {
            audio.playBomb();
            fireJuice([{
              type: 'power_up_detonated',
              powerUpType: 'bomb',
              positions: target.blastCells,
              tapPosition: target.bombPos,
              blockColor: comboColor,
            }]);
          },
        );

        for (const p of result.comboResult.affectedCells) {
          boardRenderer.setVisual(p.row, p.col, null);
        }
      } else if (result.comboType === 'rocket_colorblast' && result.comboResult.rocketColorblastTargets) {
        audio.playCombo();

        await animateRocketColorblastCombo(
          pos,
          result.comboResult.rocketColorblastTargets,
          boardRenderer,
          fxLayer,
          boardRenderer.getPowerupTexture('rocket'),
          (target) => {
            audio.playRocket();
            fireJuice([{
              type: 'power_up_detonated',
              powerUpType: 'rocket',
              positions: target.blastCells,
              tapPosition: target.rocketPos,
              blockColor: comboColor,
            }]);
          },
        );

        for (const p of result.comboResult.affectedCells) {
          boardRenderer.setVisual(p.row, p.col, null);
        }
      } else {
        fireJuice([{
          type: 'combo_detonated',
          comboType: result.comboType,
          positions: result.comboResult.affectedCells,
          tapPosition: pos,
          blockColor: comboColor,
        }]);
        audio.playCombo();

        await animateComboDetonation(
          result.comboResult.affectedCells,
          pos,
          boardRenderer,
          result.comboType as ComboType,
          fxLayer,
          boardRenderer.getPowerupTexture('rocket'),
          getPopcornTextures(),
          combo.pos,
        );

        for (const p of result.comboResult.affectedCells) {
          boardRenderer.setVisual(p.row, p.col, null);
        }
      }

      // Animate chain reactions from the combo blast
      for (const chain of result.comboResult.chainReactions) {
        fireJuice([{
          type: 'power_up_detonated',
          powerUpType: chain.type,
          rocketDirection: chain.rocketDirection,
          positions: chain.affectedCells,
          tapPosition: chain.pos,
          blockColor: chain.color,
        }]);

        boardRenderer.removePowerupAt(chain.pos.row, chain.pos.col);

        switch (chain.type) {
          case 'rocket':
            await animateRocketDetonation(
              chain.affectedCells, chain.pos, boardRenderer, chain.rocketDirection ?? 'right',
              boardRenderer.getPowerupTexture('rocket'), fxLayer,
            );
            break;
          case 'bomb':
            await animateBombDetonation(chain.affectedCells, chain.pos, boardRenderer, fxLayer, getPopcornTextures());
            break;
          case 'color_blast':
            await animateColorBurstDetonation(chain.affectedCells, chain.pos, boardRenderer, fxLayer);
            break;
        }

        for (const p of chain.affectedCells) {
          boardRenderer.setVisual(p.row, p.col, null);
        }
      }

      const comboObstacleJuice = buildObstacleJuice(prevBoard, result.finalBoard, result.obstaclesDamaged);
      if (comboObstacleJuice.length > 0) fireJuice(comboObstacleJuice);

      await Promise.all([
        animateGravity(result.movements, boardRenderer),
        animateRefill(result.refills, boardRenderer),
      ]);
    } catch {
      /* animation failed — reconcile below */
    } finally {
      board = result.finalBoard;
      boardRenderer.syncBoard(board!);
    }

    syncHud();
    resolveEndOfTurn();
  }

  // -----------------------------------------------------------------------
  // Input Handling
  // -----------------------------------------------------------------------

  function onBoardPointerTap(e: { global: { x: number; y: number } }): void {
    if (!boardRenderer) return;
    const local = boardRenderer.container.toLocal(e.global);
    const pos = boardRenderer.screenToGrid(local.x, local.y);
    if (pos) void handleTap(pos);
  }

  // -----------------------------------------------------------------------
  // Controller Interface
  // -----------------------------------------------------------------------

  return {
    gameMode: 'pixi',

    init(container: HTMLDivElement) {
      domContainer = container;
      // ── Run lifecycle: start a new run, register tab-close fallback ──
      runId = crypto.randomUUID();
      runStartTime = Date.now();
      gameEndFired = false;
      window.addEventListener('beforeunload', handleBeforeUnload);
      app = new Application();
      void app.init({
        resizeTo: container,
        background: '#3d2b1f',
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      }).then(async () => {
        container.appendChild(app!.canvas as HTMLCanvasElement);

        app!.stage.addChild(bgLayer);
        app!.stage.addChild(boardLayer);
        app!.stage.addChild(hudLayer);
        app!.stage.addChild(fxLayer);
        app!.stage.addChild(overlayLayer);
        app!.stage.addChild(interstitialLayer);
        app!.stage.eventMode = 'static';

        ecsDb = Database.create(clearpopPlugin);
        setActiveDb(ecsDb);
        cleanupObserve = bridgeEcsToSignals(ecsDb);

        const [spriteTextures, loadedLogo] = await Promise.all([
          loadSpriteAssets(theme.spriteOverrides, {
            background: theme.background.spriteKey,
            frame: theme.frame.spriteKey,
            perZoneBackgrounds: theme.background.perZone,
          }),
          // Variant logo declared by theme.branding. If the asset is missing
          // (e.g. a freshly scaffolded variant with status: "pending"), the
          // win overlay simply omits the logo — see `if (won && logoTexture)`.
          Assets.load<Texture>(theme.branding.logo).catch(() => null),
        ]);
        logoTexture = loadedLogo;

        if (spriteTextures.background) {
          bgSprite = new Sprite(spriteTextures.background);
          baseBackgroundTexture = spriteTextures.background;
          perZoneBackgrounds = spriteTextures.perZoneBackgrounds;
          bgLayer.addChild(bgSprite);
          fitBackground(app!.screen.width, app!.screen.height);
        }

        const popcornTex = ['popcorn_1', 'popcorn_2', 'popcorn_3']
          .map(k => spriteTextures.particles.get(k))
          .filter((t): t is Texture => t != null);
        setPopcornTextures(popcornTex);

        const fireTex = ['fire_1', 'fire_2', 'fire_3']
          .map(k => spriteTextures.particles.get(k))
          .filter((t): t is Texture => t != null);
        setFireTextures(fireTex);

        boardRenderer = new BoardRenderer(tuning.board.gap);
        boardRenderer.setTextures(spriteTextures);
        boardLayer.addChild(boardRenderer.container);

        hudRenderer = new HudRenderer();
        hudRenderer.setTextures(spriteTextures);
        hudLayer.addChild(hudRenderer.container);

        // Phase 1: prime ECS to get board dimensions (no dialogue, no animations yet)
        rng = createSeededRNG(Date.now());
        const primeResult = ecsDb!.actions.initLevel({ rng });
        board = primeResult.board;
        // topology was set from variant.topology at controller construction.
        // For rect, refresh it with the level's actual cols/rows so the
        // topology's own cellToScreen knows the right grid size.
        if (variant.topology.id === 'rect-orth-down') {
          topology = createRectOrthDownTopology({ cols: primeResult.board.cols, rows: primeResult.board.rows });
          setActiveTopology(topology);
        }
        gameState.setCurrentLevelConfig(primeResult.config);

        // Phase 2: initialize renderer now that board dimensions are known
        boardRenderer.init(primeResult.board, app!.screen.width, app!.screen.height, 140, 80, topology);
        syncLayout();
        ecsDb!.transactions.replaceBoard({ board: primeResult.board }); // re-sync ECS entities with correct Pixi positions

        hudRenderer.layout(app!.screen.width);

        boardRenderer.container.eventMode = 'static';
        boardRenderer.container.on('pointertap', onBoardPointerTap);

        musicStarted = true;
        audio.startGameMusic();

        if (import.meta.env.DEV) {
          (window as any).__ecs = ecsDb;
          (window as any).__restart = () => startLevel();
          (window as any).__tapAt = (row: number, col: number) => { void handleTap({ row, col }); };
          cleanupDebug = attachLevelNavDebug(ecsDb!, {
            restartLevel: () => startLevel(true),
            showZoneIntro: (zone: number, onComplete: () => void) => {
              if (!app) { onComplete(); return; }
              const steps = getZoneIntro(theme.zones, zone);
              if (!steps || steps.length === 0) { onComplete(); return; }
              ecsDb!.transactions.setPhase('animating');
              currentTalkingHeads?.destroy();
              currentTalkingHeads = null;
              currentTalkingHeads = createTalkingHeadsPixi(interstitialLayer, {
                width: app.screen.width,
                height: app.screen.height,
                steps,
                speakers: { [companionKey]: companionSpeaker },
                lastStepLabel: "LET'S BAKE \u203A",
                skipEnterAnimation: false,
                skipExitAnimation: false,
                dishImage: findZoneContent(theme.zones, zone)?.dishImage ?? undefined,
                onComplete: () => {
                  currentTalkingHeads?.destroy();
                  currentTalkingHeads = null;
                  onComplete();
                },
              });
            },
            showZoneOutro: (zone: number, onComplete: () => void) => {
              if (!app) { onComplete(); return; }
              const content = findZoneContent(theme.zones, zone);
              if (!content) { onComplete(); return; }
              ecsDb!.transactions.setPhase('animating');
              const zi = createZoneInterstitialPixi(interstitialLayer, {
                width: app.screen.width,
                height: app.screen.height,
                content,
                onComplete: () => { zi.destroy(); onComplete(); },
              });
            },
          });

          // Dev helper: show zone interstitial immediately. Usage: __testZoneInterstitial(1)
          (window as any).__testZoneInterstitial = (zone = 1) => {
            const content = findZoneContent(theme.zones, zone);
            if (content && app) {
              const zi = createZoneInterstitialPixi(interstitialLayer, {
                width: app.screen.width,
                height: app.screen.height,
                content,
                onComplete: () => { zi.destroy(); startLevel(); },
              });
            }
          };

          // Skip-level button — also triggers zone interstitial when skipping over a zone boundary
          const skipBtn = new Container();
          skipBtn.eventMode = 'static';
          skipBtn.cursor = 'pointer';
          const skipBg = new Graphics();
          skipBg.roundRect(0, 0, 70, 30, 6);
          skipBg.fill({ color: 0x444444, alpha: 0.8 });
          skipBtn.addChild(skipBg);
          const skipLabel = new Text({ text: strings.hud.skipDebug, style: { fontSize: 14, fill: 0xffffff, fontFamily: 'sans-serif' } });
          skipLabel.x = 8;
          skipLabel.y = 6;
          skipBtn.addChild(skipLabel);
          skipBtn.x = app!.screen.width - 80;
          skipBtn.y = app!.screen.height - 40;
          skipBtn.on('pointertap', () => {
            const prev = ecsDb!.resources.level;
            const next = Math.min(prev + 1, 100);
            ecsDb!.transactions.setLevel(next);
            const isZoneBoundary = isZoneLastLevel(prev);
            const completedZone = getLevelZone(prev);
            const zoneContent = isZoneBoundary ? findZoneContent(theme.zones, completedZone) : null;
            if (zoneContent && app) {
              const zi = createZoneInterstitialPixi(interstitialLayer, {
                width: app.screen.width,
                height: app.screen.height,
                content: zoneContent,
                onComplete: () => { zi.destroy(); startLevel(); },
              });
            } else {
              startLevel();
            }
          });
          hudLayer.addChild(skipBtn);
        }

        // Phase 3: show the one-time intro interstitial, then start the level
        if (app) {
          const introSlideTexts = theme.introSlides.map((s) => s.text);
          const introCompanionImages = getIntroCompanionImages(theme);
          const intro = createIntroInterstitialPixi(interstitialLayer, {
            width: app.screen.width,
            height: app.screen.height,
            slides: introSlideTexts,
            title: strings.intro.title,
            eyebrow: strings.intro.eyebrow,
            companionImages: introCompanionImages,
            onComplete: () => {
              intro.destroy();
              const firstBlockers = getAvailableObstacles(1);
              const firstRecipe = safeRecipeForBlockers(firstBlockers);
              const si = createSectionInterstitialPixi(interstitialLayer, {
                width: app!.screen.width,
                height: app!.screen.height,
                recipe: firstRecipe,
                blockers: firstBlockers,
                blockerDisplayNames: theme.blockerDisplayNames,
                companionPortrait: theme.companion.spriteKeys.idle,
                onComplete: () => { si.destroy(); startLevel(); },
              });
            },
          });
        } else {
          startLevel();
        }
      });
    },

    destroy() {
      // Last-resort: if neither Main Menu nor beforeunload fired, treat as abandoned.
      fireGameEnd('abandoned');
      audio.stopGameMusic();
      musicStarted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      domContainer = null;
      cleanupDebug?.();
      cleanupDebug = null;

      if (boardRenderer) {
        boardRenderer.container.off('pointertap', onBoardPointerTap);
        gsap.killTweensOf(boardRenderer.container);
        boardRenderer.destroy();
        boardRenderer = null;
      }

      if (hudRenderer) {
        hudRenderer.destroy();
        hudRenderer = null;
      }

      hideResultsOverlay();
      for (const layer of [bgLayer, boardLayer, hudLayer, fxLayer, overlayLayer, interstitialLayer]) {
        gsap.killTweensOf(layer);
        layer.removeChildren();
      }

      bgSprite = null;
      baseBackgroundTexture = null;
      perZoneBackgrounds = new Map();
      lastBgZone = null;
      app?.destroy(true, { children: true });
      app = null;
      board = null;
      cleanupObserve?.();
      cleanupObserve = null;
      setActiveDb(null);
      ecsDb = null;
    },

    ariaText,
  };
}
