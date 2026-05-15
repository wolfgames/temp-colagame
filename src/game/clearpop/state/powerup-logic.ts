/**
 * Power-Up Logic
 *
 * Detonation patterns for rocket, bomb, and color burst. Pure functions —
 * no Pixi, no DOM. All geometry flows through the active Topology so the
 * same logic services rect, hex, and radial.
 *
 * Axis convention: a rocket stored with `'left' | 'right'` fires along the
 * topology's *primary* axis (rect row, hex E-W, radial ring); `'up' | 'down'`
 * fires along the *secondary* axis (rect column, hex gravity chain, radial
 * spoke).
 */

import type {
  BoardState,
  GridPos,
  PowerUpType,
  BlockColor,
  RocketDirection,
} from './types';
import { cloneBoard, getCell, getCellById, setCellById, posToCellId, cellIdToPos } from './board-state';
import type { Topology, CellId, LineAxis } from '../contracts/topology';
import { createRectOrthDownTopology } from '../topologies/rect-orth-down';

function defaultTopology(board: BoardState): Topology {
  return createRectOrthDownTopology({ cols: board.cols, rows: board.rows });
}

function axisFromDirection(direction: RocketDirection): LineAxis {
  return direction === 'left' || direction === 'right' ? 'primary' : 'secondary';
}

export interface ChainReaction {
  pos: GridPos;
  type: PowerUpType;
  color: BlockColor;
  rocketDirection?: RocketDirection;
  affectedCells: GridPos[];
}

export interface BombColorblastTarget {
  bombPos: GridPos;
  blastCells: GridPos[];
}

export interface RocketColorblastTarget {
  rocketPos: GridPos;
  /** Whether this pepper fires primary axis (e.g. full row) or secondary axis. */
  direction: 'horizontal' | 'vertical';
  /** All cells cleared by this rocket's single sweep (excludes rocketPos itself). */
  blastCells: GridPos[];
}

export interface DetonationResult {
  board: BoardState;
  affectedCells: GridPos[];
  obstaclesDamaged: GridPos[];
  chainReactions: ChainReaction[];
  bombColorblastTargets?: BombColorblastTarget[];
  rocketColorblastTargets?: RocketColorblastTarget[];
}

/**
 * Detonate a rocket: clears every cell along the rocket's line axis. For
 * rect, this is the full row (`'primary'`) or column (`'secondary'`). For
 * hex it is an axial sweep; for radial, an angular ring or radial spoke.
 */
export function detonateRocket(
  board: BoardState,
  row: number,
  col: number,
  direction: RocketDirection,
  topology: Topology = defaultTopology(board),
): DetonationResult {
  const next = cloneBoard(board);
  const affected: GridPos[] = [];
  const obstaclesDamaged: GridPos[] = [];
  const triggered: TriggeredPowerUp[] = [];
  const chainReactions: ChainReaction[] = [];

  const startId = posToCellId({ row, col });
  setCellById(next, startId, { kind: 'empty' });
  affected.push({ row, col });

  const axis = axisFromDirection(direction);
  for (const id of topology.lineThrough(startId, axis)) {
    if (id === startId) continue;
    const pos = cellIdToPos(id);
    clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
  }

  chainDetonate(next, triggered, affected, obstaclesDamaged, chainReactions, topology);

  return { board: next, affectedCells: affected, obstaclesDamaged, chainReactions };
}

/**
 * Detonate a bomb: clears `topology.area(cell, 1)`. For rect, this is the
 * 3x3 Chebyshev neighbourhood; for hex, the cell + 6 axial neighbours; for
 * radial, the cell + its angular and radial neighbours.
 *
 * The bomb's own position is consumed but not counted in `affectedCells` —
 * only the surrounding cells contribute to score and animation.
 */
export function detonateBomb(
  board: BoardState,
  row: number,
  col: number,
  topology: Topology = defaultTopology(board),
): DetonationResult {
  const next = cloneBoard(board);
  const affected: GridPos[] = [];
  const obstaclesDamaged: GridPos[] = [];
  const triggered: TriggeredPowerUp[] = [];
  const chainReactions: ChainReaction[] = [];

  const startId = posToCellId({ row, col });
  setCellById(next, startId, { kind: 'empty' });

  for (const id of topology.area(startId, 1)) {
    const pos = cellIdToPos(id);
    if (pos.row === row && pos.col === col) continue;
    clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
  }

  chainDetonate(next, triggered, affected, obstaclesDamaged, chainReactions, topology);

  return { board: next, affectedCells: affected, obstaclesDamaged, chainReactions };
}

/**
 * Detonate a color burst: clears the origin powerup cell and every block
 * matching the burst's color. Iterates `topology.cells` so non-rect
 * topologies are covered.
 */
export function detonateColorBurst(
  board: BoardState,
  color: BlockColor,
  originRow: number,
  originCol: number,
  topology: Topology = defaultTopology(board),
): DetonationResult {
  const next = cloneBoard(board);
  const affected: GridPos[] = [];
  const obstaclesDamaged: GridPos[] = [];
  const triggered: TriggeredPowerUp[] = [];
  const chainReactions: ChainReaction[] = [];

  const originId = posToCellId({ row: originRow, col: originCol });
  setCellById(next, originId, { kind: 'empty' });
  affected.push({ row: originRow, col: originCol });

  for (const id of topology.cells) {
    if (id === originId) continue;
    const cell = getCellById(next, id);
    if (!cell) continue;
    const pos = cellIdToPos(id);
    if (cell.kind === 'block' && cell.color === color) {
      setCellById(next, id, { kind: 'empty' });
      affected.push(pos);
    } else if (cell.kind === 'powerup' && cell.color === color) {
      triggered.push({ pos, type: cell.powerUpType, color: cell.color, rocketDirection: cell.rocketDirection });
      setCellById(next, id, { kind: 'empty' });
      affected.push(pos);
    }
  }

  chainDetonate(next, triggered, affected, obstaclesDamaged, chainReactions, topology);

  return { board: next, affectedCells: affected, obstaclesDamaged, chainReactions };
}


// ---------------------------------------------------------------------------
// Combo Detection
// ---------------------------------------------------------------------------

export type ComboType =
  | 'rocket_rocket'
  | 'rocket_bomb'
  | 'bomb_bomb'
  | 'bomb_colorblast'
  | 'rocket_colorblast'
  | 'colorblast_colorblast';

export interface ComboPartner {
  pos: GridPos;
  powerUpType: PowerUpType;
  comboType: ComboType;
}

/**
 * Find the best combo partner for a power-up at the given position. Walks
 * `topology.neighbors` so combos are detected on any topology, and picks
 * the partner whose combo clears the most cells.
 */
export function findComboPartner(
  board: BoardState,
  row: number,
  col: number,
  topology: Topology = defaultTopology(board),
): ComboPartner | null {
  const cell = getCell(board, row, col);
  if (!cell || cell.kind !== 'powerup') return null;

  const startId = posToCellId({ row, col });
  let bestPartner: ComboPartner | null = null;
  let bestScore = -1;

  for (const neighborId of topology.neighbors(startId)) {
    const npos = cellIdToPos(neighborId);
    const neighbor = getCellById(board, neighborId);
    if (!neighbor || neighbor.kind !== 'powerup') continue;

    const comboType = resolveComboType(cell.powerUpType, neighbor.powerUpType);
    if (!comboType) continue;

    const simResult = executeCombo(
      board,
      { row, col },
      npos,
      comboType,
      topology,
    );
    const clearCount = simResult.affectedCells.length;

    if (clearCount > bestScore) {
      bestScore = clearCount;
      bestPartner = {
        pos: npos,
        powerUpType: neighbor.powerUpType,
        comboType,
      };
    }
  }

  return bestPartner;
}

function resolveComboType(a: PowerUpType, b: PowerUpType): ComboType | null {
  const key = [a, b].sort().join('_');
  const map: Record<string, ComboType> = {
    'rocket_rocket': 'rocket_rocket',
    'bomb_rocket': 'rocket_bomb',
    'bomb_bomb': 'bomb_bomb',
    'bomb_color_blast': 'bomb_colorblast',
    'color_blast_rocket': 'rocket_colorblast',
    'color_blast_color_blast': 'colorblast_colorblast',
  };
  return map[key] ?? null;
}

/**
 * Execute a combo detonation. Returns the combined area of effect.
 *
 * Each combo flavour is expressed in terms of the topology's lineThrough/
 * area/cells primitives. Rect maps to the original row/col/3×3 footprints;
 * hex and radial get topology-appropriate analogues automatically.
 */
export function executeCombo(
  board: BoardState,
  posA: GridPos,
  posB: GridPos,
  comboType: ComboType,
  topology: Topology = defaultTopology(board),
): DetonationResult {
  const next = cloneBoard(board);
  const affected: GridPos[] = [];
  const obstaclesDamaged: GridPos[] = [];
  const triggered: TriggeredPowerUp[] = [];
  const chainReactions: ChainReaction[] = [];
  let bombColorblastTargets: BombColorblastTarget[] | undefined;
  let rocketColorblastTargets: RocketColorblastTarget[] | undefined;

  const idA = posToCellId(posA);
  const idB = posToCellId(posB);
  setCellById(next, idA, { kind: 'empty' });
  setCellById(next, idB, { kind: 'empty' });

  const clearLineFrom = (anchor: GridPos, axis: LineAxis): void => {
    const anchorId = posToCellId(anchor);
    for (const id of topology.lineThrough(anchorId, axis)) {
      const pos = cellIdToPos(id);
      clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
    }
  };

  const clearArea = (anchor: GridPos, radius: number): void => {
    const anchorId = posToCellId(anchor);
    for (const id of topology.area(anchorId, radius)) {
      const pos = cellIdToPos(id);
      clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
    }
  };

  switch (comboType) {
    case 'rocket_rocket': {
      // Both rockets fire both axes, producing two overlapping crosses.
      clearLineFrom(posA, 'primary');
      clearLineFrom(posA, 'secondary');
      clearLineFrom(posB, 'primary');
      clearLineFrom(posB, 'secondary');
      break;
    }
    case 'rocket_bomb': {
      // Thick cross: every cell within radius 1 of posA, fanned out along
      // each axis. For each cell in area(posA, 1) sweep both axes.
      const anchorIdA = posToCellId(posA);
      for (const anchorId of topology.area(anchorIdA, 1)) {
        const anchorPos = cellIdToPos(anchorId);
        clearLineFrom(anchorPos, 'primary');
        clearLineFrom(anchorPos, 'secondary');
      }
      break;
    }
    case 'bomb_bomb': {
      // Double bomb — radius 2 area on posA.
      clearArea(posA, 2);
      break;
    }
    case 'colorblast_colorblast': {
      for (const id of topology.cells) {
        const pos = cellIdToPos(id);
        clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
      }
      break;
    }
    case 'bomb_colorblast': {
      const cellA = getCell(board, posA.row, posA.col);
      const cellB = getCell(board, posB.row, posB.col);
      const burstCell = (cellA?.kind === 'powerup' && cellA.powerUpType === 'color_blast') ? cellA : cellB;
      const color: BlockColor = burstCell?.kind === 'powerup' ? burstCell.color : 'blue';

      // Match cells in topology order so animation stagger reads naturally.
      const colorPositions: GridPos[] = [];
      for (const id of topology.cells) {
        const cell = getCellById(next, id);
        if (cell && cell.kind === 'block' && cell.color === color) {
          colorPositions.push(cellIdToPos(id));
        }
      }

      for (const cp of colorPositions) {
        clearAndCollect(next, cp.row, cp.col, affected, obstaclesDamaged, triggered);
      }

      bombColorblastTargets = [];
      for (const cp of colorPositions) {
        const anchorId = posToCellId(cp);
        const blastCells: GridPos[] = [];
        for (const id of topology.area(anchorId, 1)) {
          const pos = cellIdToPos(id);
          blastCells.push(pos);
          clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged, triggered);
        }
        bombColorblastTargets.push({ bombPos: cp, blastCells });
      }
      break;
    }
    case 'rocket_colorblast': {
      const cellA2 = getCell(board, posA.row, posA.col);
      const cellB2 = getCell(board, posB.row, posB.col);
      const burstCell2 = (cellA2?.kind === 'powerup' && cellA2.powerUpType === 'color_blast') ? cellA2 : cellB2;
      const color2: BlockColor = burstCell2?.kind === 'powerup' ? burstCell2.color : 'blue';

      const colorPositions2: GridPos[] = [];
      for (const id of topology.cells) {
        const cell = getCellById(next, id);
        if (cell && cell.kind === 'block' && cell.color === color2) {
          colorPositions2.push(cellIdToPos(id));
        }
      }

      // Clear matched cells first — they become the pepper launch sites.
      for (const cp of colorPositions2) {
        clearAndCollect(next, cp.row, cp.col, affected, obstaclesDamaged, triggered);
      }

      // Alternate axes per pepper so the pattern feels varied. Animator
      // labels primary as 'horizontal' and secondary as 'vertical' — the
      // string is a renderer hint, not topology-true.
      rocketColorblastTargets = [];
      colorPositions2.forEach((cp, i) => {
        const axis: LineAxis = i % 2 === 0 ? 'primary' : 'secondary';
        const directionLabel: 'horizontal' | 'vertical' = axis === 'primary' ? 'horizontal' : 'vertical';
        const anchorId = posToCellId(cp);
        const blastCells: GridPos[] = [];
        for (const id of topology.lineThrough(anchorId, axis)) {
          const pos = cellIdToPos(id);
          if (pos.row !== cp.row || pos.col !== cp.col) blastCells.push(pos);
          clearAndCollect(next, pos.row, pos.col, affected, obstaclesDamaged);
        }
        rocketColorblastTargets!.push({ rocketPos: cp, direction: directionLabel, blastCells });
      });
      break;
    }
  }

  chainDetonate(next, triggered, affected, obstaclesDamaged, chainReactions, topology);

  return { board: next, affectedCells: affected, obstaclesDamaged, chainReactions, bombColorblastTargets, rocketColorblastTargets };
}

export interface TriggeredPowerUp {
  pos: GridPos;
  type: PowerUpType;
  color: BlockColor;
  rocketDirection?: RocketDirection;
}

function clearAndCollect(
  board: BoardState,
  r: number,
  c: number,
  affected: GridPos[],
  obstaclesDamaged: GridPos[],
  triggeredPowerUps?: TriggeredPowerUp[],
): void {
  const id = posToCellId({ row: r, col: c });
  const cell = getCellById(board, id);
  if (!cell || cell.kind === 'empty') return;
  if (cell.kind === 'powerup') {
    if (triggeredPowerUps) {
      triggeredPowerUps.push({
        pos: { row: r, col: c },
        type: cell.powerUpType,
        color: cell.color,
        rocketDirection: cell.rocketDirection,
      });
    }
    setCellById(board, id, { kind: 'empty' });
    affected.push({ row: r, col: c });
  } else if (cell.kind === 'block') {
    setCellById(board, id, { kind: 'empty' });
    affected.push({ row: r, col: c });
  } else if (cell.kind === 'obstacle') {
    cell.hp--;
    if (cell.hp <= 0) {
      if (cell.trappedObstacle) {
        setCellById(board, id, {
          kind: 'obstacle',
          obstacleType: cell.trappedObstacle.obstacleType,
          hp: cell.trappedObstacle.hp,
        });
      } else {
        setCellById(board, id, cell.trappedBlock ? { ...cell.trappedBlock } : { kind: 'empty' });
      }
    }
    obstaclesDamaged.push({ row: r, col: c });
  }
}

/**
 * Chain-detonate any powerups that were hit during a detonation. Processes
 * iteratively until no more powerups are triggered. Returns chain reaction
 * metadata for animation. All geometry flows through the supplied topology.
 */
export function chainDetonate(
  board: BoardState,
  initialTriggered: TriggeredPowerUp[],
  allAffected: GridPos[],
  allObstaclesDamaged: GridPos[],
  chainReactions?: ChainReaction[],
  topology: Topology = defaultTopology(board),
): void {
  const queue = [...initialTriggered];
  const detonated = new Set<CellId>();

  while (queue.length > 0) {
    const pu = queue.shift()!;
    const key = posToCellId(pu.pos);
    if (detonated.has(key)) continue;
    detonated.add(key);

    const triggered: TriggeredPowerUp[] = [];
    const chainAffected: GridPos[] = [];

    switch (pu.type) {
      case 'rocket': {
        const dir = pu.rocketDirection ?? 'right';
        const axis = axisFromDirection(dir);
        for (const id of topology.lineThrough(key, axis)) {
          if (id === key) continue;
          const pos = cellIdToPos(id);
          clearAndCollect(board, pos.row, pos.col, chainAffected, allObstaclesDamaged, triggered);
        }
        break;
      }
      case 'bomb': {
        for (const id of topology.area(key, 1)) {
          if (id === key) continue;
          const pos = cellIdToPos(id);
          clearAndCollect(board, pos.row, pos.col, chainAffected, allObstaclesDamaged, triggered);
        }
        break;
      }
      case 'color_blast': {
        for (const id of topology.cells) {
          const cell = getCellById(board, id);
          if (cell && cell.kind === 'block' && cell.color === pu.color) {
            const pos = cellIdToPos(id);
            clearAndCollect(board, pos.row, pos.col, chainAffected, allObstaclesDamaged, triggered);
          }
        }
        break;
      }
    }

    // Merge chain-affected into the global set
    for (const ca of chainAffected) allAffected.push(ca);

    // Record chain reaction metadata for animation
    chainReactions?.push({
      pos: pu.pos,
      type: pu.type,
      color: pu.color,
      rocketDirection: pu.rocketDirection,
      affectedCells: chainAffected,
    });

    // Add newly triggered powerups to the queue
    for (const t of triggered) {
      if (!detonated.has(posToCellId(t.pos))) {
        queue.push(t);
      }
    }
  }
}
