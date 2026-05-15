/**
 * Obstacle Logic
 *
 * Pure functions for obstacle placement, damage resolution, and rendering hints.
 * Obstacles are the win condition: clear all obstacles to win a level.
 */

import type {
  BoardState,
  BoardCell,
  ObstacleCell,
  ObstacleType,
  GridPos,
} from './types';
import { OBSTACLE_MAX_HP } from './types';
import { cloneBoard, getCell, getCellById, setCellById, posToCellId, cellIdToPos } from './board-state';
import type { Topology } from '../contracts/topology';
import { createRectOrthDownTopology } from '../topologies/rect-orth-down';

export interface ObstacleDamageResult {
  board: BoardState;
  damaged: {
    pos: GridPos;
    newHp: number;
    destroyed: boolean;
    obstacleType: ObstacleType;
    /** Set when a safe is destroyed and reveals an obstacle underneath. */
    revealedObstacle?: { obstacleType: ObstacleType; hp: number };
  }[];
}

/**
 * After a group of blocks is cleared, check all topology-neighbors of the
 * cleared cells for obstacles and apply 1 hit of damage to each.
 * Each obstacle is only damaged once per clear action (deduped by cell id).
 */
export function resolveAdjacencyClear(
  board: BoardState,
  clearedCells: GridPos[],
  skipCells: GridPos[] = [],
  topology: Topology = createRectOrthDownTopology({ cols: board.cols, rows: board.rows }),
): ObstacleDamageResult {
  const next = cloneBoard(board);
  const damagedMap = new Map<string, ObstacleDamageResult['damaged'][number]>();
  const skipSet = new Set(skipCells.map(posToCellId));

  for (const cleared of clearedCells) {
    const clearedId = posToCellId(cleared);
    for (const neighborId of topology.neighbors(clearedId)) {
      if (damagedMap.has(neighborId)) continue;
      if (skipSet.has(neighborId)) continue;

      const cell = getCellById(next, neighborId);
      if (!cell || cell.kind !== 'obstacle') continue;

      const pos = cellIdToPos(neighborId);
      cell.hp--;
      const destroyed = cell.hp <= 0;

      if (destroyed) {
        if (cell.trappedObstacle) {
          setCellById(next, neighborId, {
            kind: 'obstacle',
            obstacleType: cell.trappedObstacle.obstacleType,
            hp: cell.trappedObstacle.hp,
          });
        } else {
          setCellById(next, neighborId, cell.trappedBlock
            ? { ...cell.trappedBlock }
            : { kind: 'empty' });
        }
      }

      damagedMap.set(neighborId, {
        pos,
        newHp: Math.max(0, cell.hp),
        destroyed,
        obstacleType: cell.obstacleType,
        revealedObstacle: destroyed ? cell.trappedObstacle : undefined,
      });
    }
  }

  return {
    board: next,
    damaged: Array.from(damagedMap.values()),
  };
}

/**
 * Create an obstacle cell with full HP.
 */
export function createObstacle(
  type: ObstacleType,
  trappedBlock?: { kind: 'block'; color: import('./types').BlockColor },
  trappedObstacle?: { obstacleType: ObstacleType; hp: number },
): ObstacleCell {
  return {
    kind: 'obstacle',
    obstacleType: type,
    hp: OBSTACLE_MAX_HP[type],
    trappedBlock,
    trappedObstacle,
  };
}

/**
 * Place obstacles onto a board at specified positions.
 * Used during level generation.
 */
export function placeObstacles(
  board: BoardState,
  placements: { pos: GridPos; type: ObstacleType }[],
): BoardState {
  const next = cloneBoard(board);

  for (const { pos, type } of placements) {
    const id = posToCellId(pos);
    const existing = getCellById(next, id);
    if (!existing) continue;

    if (type === 'ice' || type === 'jelly' || type === 'cage' || type === 'cookie') {
      const trapped = existing.kind === 'block' ? { ...existing } : undefined;
      setCellById(next, id, createObstacle(type, trapped as any));
    } else {
      setCellById(next, id, createObstacle(type));
    }
  }

  return next;
}

/**
 * Zone 1 (levels 1–10) uses solo-debut windows: each new blocker gets a few
 * levels alone before joining the mix. This keeps intros legible.
 */
function getZoneOneObstacles(levelId: number): ObstacleType[] {
  if (levelId <= 1)  return ['marshmallow'];
  if (levelId <= 2)  return ['egg'];
  if (levelId <= 4)  return ['marshmallow', 'egg'];
  if (levelId <= 6)  return ['cookie'];
  if (levelId <= 8)  return ['marshmallow'];
  return ['marshmallow', 'egg', 'cookie'];
}

/**
 * Zone-themed blocker rotation (zones 2–10, levels 11–100).
 *
 * Each zone features two primary blockers and an optional accent. Primaries
 * anchor the zone identity and repeat across 7 of the 10 levels; the accent
 * only appears in the last 3 levels of the zone, so no level ever mixes more
 * than 3 blocker types.
 */
interface ZoneTheme {
  primary: [ObstacleType, ObstacleType];
  accent?: ObstacleType;
}

const ZONE_BLOCKER_THEMES: Record<number, ZoneTheme> = {
  2:  { primary: ['safe', 'egg'],             accent: 'jelly'  },
  3:  { primary: ['cookie', 'marshmallow'],  accent: 'safe' },
  4:  { primary: ['jelly', 'cage'],          accent: 'marshmallow' },
  5:  { primary: ['cage', 'safe'],           accent: 'cookie' },
  6:  { primary: ['marshmallow', 'cookie'],  accent: 'cage' },
  7:  { primary: ['egg', 'cookie'],          accent: 'safe' },
  8:  { primary: ['cookie', 'cage'],         accent: 'marshmallow' },
  9:  { primary: ['cookie', 'safe'],         accent: 'egg' },
  10: { primary: ['cage', 'safe'],           accent: 'cookie' },
};

/**
 * Per-level mix ramp within a zone (positions are 0-indexed):
 *   pos 0–2  → 1 primary   (ease-in)
 *   pos 3–6  → 2 primaries (main pressure)
 *   pos 7–9  → 2 primaries + accent (zone climax)
 */
function getZoneObstacles(zone: number, positionInZone: number): ObstacleType[] {
  const theme = ZONE_BLOCKER_THEMES[zone];
  if (!theme) return ['marshmallow']; // defensive fallback

  if (positionInZone < 3) return [theme.primary[0]];
  if (positionInZone < 7) return [theme.primary[0], theme.primary[1]];
  return theme.accent
    ? [theme.primary[0], theme.primary[1], theme.accent]
    : [theme.primary[0], theme.primary[1]];
}

export function getAvailableObstacles(levelId: number): ObstacleType[] {
  if (levelId <= 10) return getZoneOneObstacles(levelId);

  const zone = Math.floor((levelId - 1) / 10) + 1;
  const positionInZone = (levelId - 1) % 10;
  return getZoneObstacles(zone, positionInZone);
}
