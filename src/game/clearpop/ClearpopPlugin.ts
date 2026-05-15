/**
 * ClearPop ECS Plugin
 *
 * ECS is source of truth. Resources hold game state. Entities hold board cells.
 * Computed observables derive stars and blocker count. Actions encapsulate
 * turn logic (tap, powerup). SolidJS signals are derived via observe bridge.
 */
import { Database } from '@adobe/data/ecs';
import { Observe } from '@adobe/data/observe';
import { Vec2, F32 } from '@adobe/data/math';
import type {
  BoardState, BoardCell, BlockColor, ObstacleType, PowerUpType, RocketDirection,
  GridPos, FallMovement, RefillEntry,
} from './state/types';
import { getCell, getCellById, setCellById, countObstacles, cellIdToPos } from './state/board-state';
import { cellIdOf } from './topologies/rect-orth-down';
import { findGroup, clearGroup, applyGravity, refillBoard } from './state/game-logic';
import { createRectOrthDownTopology } from './topologies/rect-orth-down';
import type { Topology, CellId } from './contracts/topology';
import {
  detonateRocket, detonateBomb, detonateColorBurst,
  findComboPartner, executeCombo as executeComboLogic,
} from './state/powerup-logic';
import { calcGroupScore, calcStarsEarned } from './state/scoring';
import { resolveAdjacencyClear } from './state/obstacle-logic';
import { generateLevel } from './state/level-generator';
import { getLevelConfig as getLevelConfigFromTable } from './state/level-configs';
import { createSeededRNG, type SeededRNG } from './state/seeded-rng';
import { gameState } from '~/game/state';

// ── Active topology singleton ───────────────────────────────────────
//
// The plugin's actions and the ECS<->board helpers need the variant's
// topology, but the plugin can't take constructor args. GameController
// calls `setActiveTopology` once before init; the plugin reads it inside
// each action. Rect topology is the fallback so tests and rect variants
// keep working without explicit setup.

let activeTopology: Topology | null = null;

export function setActiveTopology(topology: Topology): void {
  activeTopology = topology;
}

function resolveTopology(cols: number, rows: number): Topology {
  return activeTopology ?? createRectOrthDownTopology({ cols, rows });
}

// ── Plugin ──────────────────────────────────────────────────────────

export const clearpopPlugin = Database.Plugin.create({
  components: {
    position: Vec2.schema,
    gridPos: Vec2.schema,
    cellKind: { type: 'string', default: '' } as const,
    blockColor: { type: 'string', default: '' } as const,
    obstacleType: { type: 'string', default: '' } as const,
    obstacleHp: F32.schema,
    powerUpType: { type: 'string', default: '' } as const,
    rocketDirection: { type: 'string', default: '' } as const,
    hasTrap: { type: 'boolean', default: false } as const,
    trappedBlockColor: { type: 'string', default: '' } as const,
    trappedObstacleType: { type: 'string', default: '' } as const,
    trappedObstacleHp: F32.schema,
    spriteKey: { type: 'string', default: '' } as const,
  },
  resources: {
    gameName: { default: 'ClearPop' as string },
    score: { default: 0 as number },
    movesRemaining: { default: 0 as number },
    level: { default: 1 as number },
    phase: { default: 'idle' as string },
    blockerCount: { default: 0 as number },
    starsEarned: { default: 0 as number },
    starThresholds: { default: [1000, 2000, 3000] as [number, number, number] },
    boardCols: { default: 8 as number },
    boardRows: { default: 8 as number },
    colorCount: { default: 3 as number },
    seed: { default: 0 as number },
    coins: { default: 0 as number },
    lives: { default: 5 as number },
    goalType: { default: 'score' as string },
    goalTarget: { default: 2000 as number },
    goalLabel: { default: 'Score 2000' as string },
    goalProgress: { default: 0 as number },
    blocksCleared: { default: 0 as number },
    // Board layout in Pixi world coords — set by GameController after init/resize
    layoutOffsetX: { default: 0 as number },
    layoutOffsetY: { default: 0 as number },
    layoutTileSize: { default: 64 as number },
    layoutGap: { default: 3 as number },
    /** Width/height of the topology's local bounding rect — passed into
     *  `topology.cellToScreen(id, {x:0, y:0, width, height})` so positions
     *  match what `BoardRenderer.cellToScreen` produces. Set by
     *  GameController via `setLayout`. */
    layoutBoardWidth: { default: 0 as number },
    layoutBoardHeight: { default: 0 as number },
  },
  archetypes: {
    Block: ['position', 'gridPos', 'cellKind', 'blockColor', 'spriteKey'],
    Obstacle: ['position', 'gridPos', 'cellKind', 'obstacleType', 'obstacleHp', 'hasTrap', 'trappedBlockColor', 'trappedObstacleType', 'trappedObstacleHp', 'spriteKey'],
    PowerUp: ['position', 'gridPos', 'cellKind', 'powerUpType', 'blockColor', 'rocketDirection', 'spriteKey'],
  },
  computed: {
    /** Derived: star count from score + thresholds */
    computedStars: (db) => {
      return Observe.withMap(
        db.observe.resources.score,
        (score) => calcStarsEarned(score, [...db.resources.starThresholds] as [number, number, number]),
      );
    },
    /** Derived: obstacle count from entity query */
    computedBlockerCount: (db) => {
      return Observe.withMap(
        db.observe.components.cellKind,
        () => {
          const all = db.select(['cellKind']);
          let count = 0;
          for (const id of all) {
            const data = db.read(id);
            if (data && (data as { cellKind: string }).cellKind === 'obstacle') count++;
          }
          return count;
        },
      );
    },
  },
  transactions: {
    // ── Board transaction: replace entire board in one atomic write ──
    replaceBoard(store, args: { board: BoardState }) {
      // Clear existing entities
      for (const id of store.select(['cellKind'])) {
        store.delete(id);
      }
      // Insert new entities with Pixi world positions sourced from the
      // active topology. `gridPos` stores [col, row] = [secondPart, firstPart]
      // of the cellId so `readBoardFromEcs` can round-trip via cellIdOf.
      const { board } = args;
      const topology = resolveTopology(board.cols, board.rows);
      const ox = store.resources.layoutOffsetX;
      const oy = store.resources.layoutOffsetY;
      const half = store.resources.layoutTileSize / 2;
      // `cellToScreen` returns the cell centre in the board's local space;
      // the renderer offsets it by `layoutOffsetX/Y` to reach world space.
      // The local-bounds rect is encoded in the board renderer at init time
      // and mirrored here via the layout resources.
      const localBounds = {
        x: 0,
        y: 0,
        width: store.resources.layoutBoardWidth,
        height: store.resources.layoutBoardHeight,
      };
      for (const cellId of topology.cells) {
        const cell = getCellById(board, cellId);
        if (!cell || cell.kind === 'empty') continue;

        const center = topology.cellToScreen(cellId, localBounds);
        const px: [number, number] = [ox + center.x, oy + center.y];
        const idPos = cellIdToPos(cellId);
        const gp: [number, number] = [idPos.col, idPos.row];

        switch (cell.kind) {
          case 'block':
            store.archetypes.Block.insert({
              position: px, gridPos: gp,
              cellKind: 'block', blockColor: cell.color,
              spriteKey: `${cell.color} [${cellId}]`,
            });
            break;
          case 'obstacle':
            store.archetypes.Obstacle.insert({
              position: px, gridPos: gp,
              cellKind: 'obstacle', obstacleType: cell.obstacleType,
              obstacleHp: cell.hp, hasTrap: !!cell.trappedBlock,
              trappedBlockColor: cell.trappedBlock?.color ?? '',
              trappedObstacleType: cell.trappedObstacle?.obstacleType ?? '',
              trappedObstacleHp: cell.trappedObstacle?.hp ?? 0,
              spriteKey: `${cell.obstacleType}${cell.trappedBlock ? '+trap' : ''}${cell.trappedObstacle ? '+obs' : ''} hp:${cell.hp} [${cellId}]`,
            });
            break;
          case 'powerup':
            store.archetypes.PowerUp.insert({
              position: px, gridPos: gp,
              cellKind: 'powerup', powerUpType: cell.powerUpType,
              blockColor: cell.color, rocketDirection: cell.rocketDirection ?? '',
              spriteKey: `${cell.powerUpType} (${cell.color}) [${cellId}]`,
            });
            break;
        }
      }
      void half; // half-tile centring is now baked into cellToScreen
    },

    // ── Layout — set by GameController after init/resize, before replaceBoard ──
    setLayout(store, layout: { offsetX: number; offsetY: number; tileSize: number; gap: number; boardWidth: number; boardHeight: number }) {
      store.resources.layoutOffsetX = layout.offsetX;
      store.resources.layoutOffsetY = layout.offsetY;
      store.resources.layoutTileSize = layout.tileSize;
      store.resources.layoutGap = layout.gap;
      store.resources.layoutBoardWidth = layout.boardWidth;
      store.resources.layoutBoardHeight = layout.boardHeight;
    },

    // ── Resource transactions ──
    setScore(store, score: number) { store.resources.score = score; },
    addScore(store, amount: number) { store.resources.score += amount; },
    setMovesRemaining(store, moves: number) { store.resources.movesRemaining = moves; },
    decrementMoves(store) { store.resources.movesRemaining = Math.max(0, store.resources.movesRemaining - 1); },
    setLevel(store, level: number) { store.resources.level = level; },
    incrementLevel(store) { store.resources.level += 1; },
    setPhase(store, phase: string) { store.resources.phase = phase; },
    setBlockerCount(store, count: number) { store.resources.blockerCount = count; },
    setStarsEarned(store, stars: number) { store.resources.starsEarned = stars; },
    setLevelConfig(store, args: {
      starThresholds: [number, number, number];
      cols: number; rows: number; colorCount: number; seed: number;
    }) {
      store.resources.starThresholds = args.starThresholds;
      store.resources.boardCols = args.cols;
      store.resources.boardRows = args.rows;
      store.resources.colorCount = args.colorCount;
      store.resources.seed = args.seed;
    },
    setCoins(store, coins: number) { store.resources.coins = coins; },
    addCoins(store, amount: number) { store.resources.coins += amount; },
    setLives(store, lives: number) { store.resources.lives = lives; },
    setGoal(store, goal: { type: string; target: number; label: string }) {
      store.resources.goalType = goal.type;
      store.resources.goalTarget = goal.target;
      store.resources.goalLabel = goal.label;
      store.resources.goalProgress = 0;
      store.resources.blocksCleared = 0;
    },
    addBlocksCleared(store, count: number) { store.resources.blocksCleared += count; },
  },
  actions: {
    /** Execute a full tap turn: clear → gravity → refill. Returns animation metadata. */
    executeTap(db, args: { row: number; col: number; rng: SeededRNG }) {
      const topology = resolveTopology(db.resources.boardCols, db.resources.boardRows);
      const board = readBoardFromEcs(db, db.resources.boardCols, db.resources.boardRows, topology);
      const tappedCell = getCell(board, args.row, args.col);

      if (!tappedCell || tappedCell.kind !== 'block') return null;

      const group = findGroup(board, args.row, args.col, topology);
      if (group.length < 2) return null;

      const blockColor = tappedCell.color;
      const score = calcGroupScore(group.length);

      // Run pure logic chain
      const clearResult = clearGroup(board, group, { row: args.row, col: args.col });
      const skipCells = clearResult.spawnedObstacle ? [clearResult.spawnedObstacle] : [];
      const adjacencyResult = resolveAdjacencyClear(clearResult.board, clearResult.cleared, skipCells, topology);
      const anchoredCells = clearResult.spawnedObstacle ? [clearResult.spawnedObstacle] : [];
      const gravityResult = applyGravity(adjacencyResult.board, anchoredCells, topology);
      const refillResult = refillBoard(gravityResult.board, args.rng, db.resources.colorCount, topology);

      // Single atomic write: board + resources
      db.transactions.replaceBoard({ board: refillResult.board });
      db.transactions.decrementMoves();
      db.transactions.addScore(score);
      db.transactions.addBlocksCleared(group.length);
      db.transactions.setBlockerCount(countObstacles(refillResult.board));
      db.transactions.setStarsEarned(
        calcStarsEarned(db.resources.score, [...db.resources.starThresholds] as [number, number, number]),
      );

      return {
        group,
        blockColor,
        score,
        spawnedPowerUp: clearResult.spawnedPowerUp,
        spawnedRocketDirection: clearResult.spawnedRocketDirection,
        spawnedObstacle: clearResult.spawnedObstacle,
        obstaclesDamaged: adjacencyResult.damaged,
        movements: gravityResult.movements,
        refills: refillResult.refills,
        finalBoard: refillResult.board,
      };
    },

    /** Execute a powerup detonation turn. Returns animation metadata. */
    executePowerUp(db, args: { row: number; col: number; rng: SeededRNG }) {
      const topology = resolveTopology(db.resources.boardCols, db.resources.boardRows);
      const board = readBoardFromEcs(db, db.resources.boardCols, db.resources.boardRows, topology);
      const cell = getCell(board, args.row, args.col);
      if (!cell || cell.kind !== 'powerup') return null;

      // Each powerup fires individually; chain reactions handle cascading
      let detonationResult;
      switch (cell.powerUpType) {
        case 'rocket':
          detonationResult = detonateRocket(board, args.row, args.col, (cell.rocketDirection ?? 'right') as RocketDirection, topology);
          break;
        case 'bomb':
          detonationResult = detonateBomb(board, args.row, args.col, topology);
          break;
        case 'color_blast':
          detonationResult = detonateColorBurst(board, cell.color as BlockColor, args.row, args.col, topology);
          break;
        default:
          return null;
      }

      const adjacencyResult = resolveAdjacencyClear(
        detonationResult.board,
        detonationResult.affectedCells,
        [],
        topology,
      );

      const gravityResult = applyGravity(adjacencyResult.board, [], topology);
      const refillResult = refillBoard(gravityResult.board, args.rng, db.resources.colorCount, topology);

      const score = calcGroupScore(detonationResult.affectedCells.length);

      db.transactions.replaceBoard({ board: refillResult.board });
      db.transactions.decrementMoves();
      db.transactions.addScore(score);
      db.transactions.setBlockerCount(countObstacles(refillResult.board));
      db.transactions.setStarsEarned(
        calcStarsEarned(db.resources.score, [...db.resources.starThresholds] as [number, number, number]),
      );

      const allObstaclesDamaged = [
        ...detonationResult.obstaclesDamaged,
        ...adjacencyResult.damaged.map(d => d.pos),
      ];

      return {
        cell,
        detonationResult,
        adjacencyDamaged: adjacencyResult.damaged,
        score,
        movements: gravityResult.movements,
        refills: refillResult.refills,
        finalBoard: refillResult.board,
        obstaclesDamaged: allObstaclesDamaged,
      };
    },

    /** Detect if a powerup at (row,col) has a combo partner. Returns partner info or null. */
    detectCombo(db, args: { row: number; col: number }) {
      const topology = resolveTopology(db.resources.boardCols, db.resources.boardRows);
      const board = readBoardFromEcs(db, db.resources.boardCols, db.resources.boardRows, topology);
      return findComboPartner(board, args.row, args.col, topology);
    },

    /** Execute a combo detonation turn between two adjacent powerups. Returns animation metadata. */
    executeComboAction(db, args: { row: number; col: number; partnerRow: number; partnerCol: number; rng: SeededRNG }) {
      const topology = resolveTopology(db.resources.boardCols, db.resources.boardRows);
      const board = readBoardFromEcs(db, db.resources.boardCols, db.resources.boardRows, topology);
      const cellA = getCell(board, args.row, args.col);
      const cellB = getCell(board, args.partnerRow, args.partnerCol);
      if (!cellA || cellA.kind !== 'powerup' || !cellB || cellB.kind !== 'powerup') return null;

      const partner = findComboPartner(board, args.row, args.col, topology);
      if (!partner || partner.pos.row !== args.partnerRow || partner.pos.col !== args.partnerCol) return null;

      const comboResult = executeComboLogic(
        board,
        { row: args.row, col: args.col },
        { row: args.partnerRow, col: args.partnerCol },
        partner.comboType,
        topology,
      );

      const adjacencyResult = resolveAdjacencyClear(
        comboResult.board,
        comboResult.affectedCells,
        [],
        topology,
      );

      const gravityResult = applyGravity(adjacencyResult.board, [], topology);
      const refillResult = refillBoard(gravityResult.board, args.rng, db.resources.colorCount, topology);

      const score = calcGroupScore(comboResult.affectedCells.length);

      db.transactions.replaceBoard({ board: refillResult.board });
      db.transactions.decrementMoves();
      db.transactions.addScore(score);
      db.transactions.addBlocksCleared(comboResult.affectedCells.length);
      db.transactions.setBlockerCount(countObstacles(refillResult.board));
      db.transactions.setStarsEarned(
        calcStarsEarned(db.resources.score, [...db.resources.starThresholds] as [number, number, number]),
      );

      const allObstaclesDamaged = [
        ...comboResult.obstaclesDamaged,
        ...adjacencyResult.damaged.map(d => d.pos),
      ];

      return {
        cellA,
        cellB,
        comboType: partner.comboType,
        comboResult,
        adjacencyDamaged: adjacencyResult.damaged,
        score,
        movements: gravityResult.movements,
        refills: refillResult.refills,
        finalBoard: refillResult.board,
        obstaclesDamaged: allObstaclesDamaged,
      };
    },

    /** Initialize a level: generate board, reset resources. */
    initLevel(db, args: { rng: SeededRNG }) {
      const config = getLevelConfigFromTable(db.resources.level);
      const topology = activeTopology ?? createRectOrthDownTopology({ cols: config.cols, rows: config.rows });

      const board = generateLevel({
        levelId: config.levelId,
        cols: config.cols,
        rows: config.rows,
        colorCount: config.colorCount,
        seed: config.seed,
        obstacleTypes: config.obstacleTypes,
        bottomBlockerZone: config.bottomBlockerZone,
      }, topology);

      const obstacleCount = countObstacles(board);
      const goal = config.goal.type === 'obstacle'
        ? { type: 'obstacle', target: obstacleCount, label: `Clear ${obstacleCount} obstacles` }
        : config.goal;

      // For non-rect topologies, "cols * rows" isn't the cell count. Use
      // `topology.cells.length` so the move-budget heuristic is meaningful.
      const totalCells = topology.cells.length || (config.cols * config.rows);
      const moves = obstacleCount / Math.max(1, totalCells) < 0.3 ? 20 : config.moves;

      db.transactions.replaceBoard({ board });
      db.transactions.setScore(0);
      db.transactions.setMovesRemaining(moves);
      db.transactions.setStarsEarned(0);
      db.transactions.setBlockerCount(obstacleCount);
      db.transactions.setGoal({ type: goal.type, target: goal.target, label: goal.label });
      db.transactions.setLevelConfig({
        starThresholds: config.starThresholds,
        cols: config.cols,
        rows: config.rows,
        colorCount: config.colorCount,
        seed: config.seed,
      });
      db.transactions.setPhase('idle');

      return { board, config };
    },
  },
  systems: {
    clearpop_initialize: {
      create: (_db) => {
        // Init-only — signals that the ClearPop plugin is loaded.
        // Actual level init happens via db.actions.initLevel().
      },
    },
  },
});

export type ClearpopDatabase = Database.FromPlugin<typeof clearpopPlugin>;

// ── Observe bridge: ECS resources → SolidJS signals ─────────────────

type Unobserve = () => void;

export function bridgeEcsToSignals(db: ClearpopDatabase): Unobserve {
  const unsubs: Unobserve[] = [];
  unsubs.push(db.observe.resources.score((v) => gameState.setScore(v)));
  unsubs.push(db.observe.resources.movesRemaining((v) => gameState.setMovesRemaining(v)));
  unsubs.push(db.observe.resources.level((v) => gameState.setLevel(v)));
  unsubs.push(db.observe.resources.starsEarned((v) => gameState.setStarsEarned(v)));
  unsubs.push(db.observe.resources.blockerCount((v) => gameState.setBlockerCount(v)));
  unsubs.push(db.observe.resources.coins((v) => gameState.setCoins(v)));
  unsubs.push(db.observe.resources.lives((v) => gameState.setLives(v)));
  return () => unsubs.forEach((fn) => fn());
}

// ── Board read helper ───────────────────────────────────────────────

export function readBoardFromEcs(
  db: ClearpopDatabase,
  cols: number,
  rows: number,
  topology: Topology = resolveTopology(cols, rows),
): BoardState {
  const cellsById = new Map<CellId, BoardCell>();
  // Pre-populate every topology cell as empty so iteration callers always
  // see a defined cell — matches createEmptyBoard's invariant for rect.
  for (const id of topology.cells) {
    cellsById.set(id, { kind: 'empty' });
  }
  const board: BoardState = { cellsById, cols, rows };

  const validIds = new Set<CellId>(topology.cells);
  const entities = db.select(['gridPos', 'cellKind']);
  for (const entityId of entities) {
    const data = db.read(entityId);
    if (!data) continue;

    const [col, row] = data.gridPos as [number, number];
    const id = cellIdOf(row, col);
    if (!validIds.has(id)) continue;

    const kind = data.cellKind as string;

    switch (kind) {
      case 'block':
        setCellById(board, id, {
          kind: 'block',
          color: (data.blockColor as string) as BlockColor,
        });
        break;
      case 'obstacle': {
        const trappedColor = data.trappedBlockColor as string;
        const trappedObsType = data.trappedObstacleType as string;
        const trappedObsHp = data.trappedObstacleHp as number;
        setCellById(board, id, {
          kind: 'obstacle',
          obstacleType: (data.obstacleType as string) as ObstacleType,
          hp: data.obstacleHp as number,
          ...(trappedColor
            ? { trappedBlock: { kind: 'block' as const, color: trappedColor as BlockColor } }
            : {}),
          ...(trappedObsType
            ? { trappedObstacle: { obstacleType: trappedObsType as ObstacleType, hp: trappedObsHp } }
            : {}),
        });
        break;
      }
      case 'powerup': {
        const rocketDir = data.rocketDirection as string;
        setCellById(board, id, {
          kind: 'powerup',
          powerUpType: (data.powerUpType as string) as PowerUpType,
          color: (data.blockColor as string) as BlockColor,
          ...(rocketDir ? { rocketDirection: rocketDir as RocketDirection } : {}),
        });
        break;
      }
    }
  }

  return board;
}
