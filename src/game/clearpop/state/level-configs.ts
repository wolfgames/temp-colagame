/**
 * Level Configurations
 *
 * Per-level settings for the 100-level campaign across 10 zones.
 * Each zone = 10 levels with escalating difficulty.
 */

import type { LevelConfig, LevelGoal, BottomBlockerZoneConfig } from './types';
import type { ObstacleType } from './types';
import { getAvailableObstacles } from './obstacle-logic';

const ZONE_SIZE = 10;

function pickGoal(_levelId: number, _zone: number, _positionInZone: number): LevelGoal {
  // target=0 is a placeholder; initLevel sets the real count after board generation
  return { type: 'obstacle', target: 0, label: 'Clear all obstacles' };
}

/**
 * Zone-themed bottom blocker zone configs.
 *
 * Each zone entry defines configs for two positions within the zone:
 *   pos 4 (mid-climax) — simple solid fill, 2-row zone
 *   pos 9 (zone finale) — fill + centered inlay, row count scales with zone depth
 *
 * Zones 1-2 are excluded (too early; players are still learning obstacle types).
 * Overlays use left-half coords (col 0-3 on an 8-col board); mirrorSymmetryPass
 * mirrors them to the right half automatically.
 */
interface ZoneBlockerTheme {
  fill: ObstacleType;
  accent: ObstacleType;
}

const ZONE_BLOCKER_ZONE_THEMES: Record<number, ZoneBlockerTheme> = {
  1:  { fill: 'marshmallow', accent: 'egg'        },
  2:  { fill: 'egg',         accent: 'marshmallow' },
  3:  { fill: 'cookie',     accent: 'marshmallow' },
  4:  { fill: 'jelly',      accent: 'cage'        },
  5:  { fill: 'cage',       accent: 'safe'        },
  6:  { fill: 'marshmallow',accent: 'cookie'      },
  7:  { fill: 'egg',        accent: 'cookie'      },
  8:  { fill: 'cookie',     accent: 'cage'        },
  9:  { fill: 'cookie',     accent: 'safe'        },
  10: { fill: 'cage',       accent: 'safe'        },
};

/** Number of zone rows by zone depth (1-indexed zone number). */
function zoneRowCount(zone: number, isFinale: boolean): number {
  if (zone <= 5) return isFinale ? 3 : 2;
  if (zone <= 8) return isFinale ? 4 : 3;
  return isFinale ? 6 : 5;
}

/**
 * Returns the bottom blocker zone config for a level, or undefined if
 * this level doesn't use the bottom-half variant.
 *
 * Positions per zone scale with zone depth — formulaic, never hardcoded.
 * Positions are spread evenly across the zone using a zone-seeded offset.
 *
 * Zones 1–3:  2 bottom-zone levels per zone
 * Zones 4–7:  3 bottom-zone levels per zone
 * Zones 8–10: 4 bottom-zone levels per zone
 *
 * The last selected position in the zone is treated as the "finale"
 * (inlay + more rows). All others are simple solid fills.
 */
function bottomZoneLevelCount(zone: number): number {
  if (zone <= 2) return 2;
  if (zone <= 6) return 3;
  return 4;
}

function getBottomBlockerZonePositions(zone: number): number[] {
  const count = bottomZoneLevelCount(zone);
  // Spread `count` positions evenly across 0–9, shifted by zone to avoid repetition.
  const spacing = Math.floor(10 / count);
  const offset = (zone * 7) % spacing;
  return Array.from({ length: count }, (_, i) => (offset + i * spacing) % 10);
}

function getBottomBlockerZone(
  zone: number,
  positionInZone: number,
): BottomBlockerZoneConfig | undefined {
  const positions = getBottomBlockerZonePositions(zone);
  if (!positions.includes(positionInZone)) return undefined;

  const theme = ZONE_BLOCKER_ZONE_THEMES[zone];
  if (!theme) return undefined;

  const isFinale = positionInZone === Math.max(...positions);
  const rows = zoneRowCount(zone, isFinale);

  if (!isFinale) {
    // Mid-climax: solid fill, no inlay
    return { rows, fill: theme.fill };
  }

  // Zone finale: fill + a centered 2×2 inlay of the accent type on the left half.
  // On an 8-col board the left half is cols 0-3 (width 4).
  // A 2-wide inlay starting at col 1 sits centered in that half.
  return {
    rows,
    fill: theme.fill,
    overlays: [
      {
        type: theme.accent,
        rowOffset: 1,   // one row up from the bottom of the zone
        rowCount: 2,
        colOffset: 1,   // centered in the left half (cols 1-2 → mirrors to 5-6)
        colCount: 2,
      },
    ],
  };
}

/**
 * Generate a level config for any level ID.
 * Uses formulaic scaling rather than hand-authored data for prototyping.
 */
export function getLevelConfig(levelId: number): LevelConfig {
  const zone = Math.floor((levelId - 1) / ZONE_SIZE) + 1;
  const positionInZone = (levelId - 1) % ZONE_SIZE;

  const colorCount = 3;

  const obstacleTypes = getAvailableObstacles(levelId);
  const bottomBlockerZone = getBottomBlockerZone(zone, positionInZone);

  // Bottom-zone levels get extra moves — the obstacle floor adds significant clearing work.
  const baseMoves = obstacleTypes.length >= 3 ? 40 : 30;
  const moves = bottomBlockerZone ? baseMoves + 10 : baseMoves;

  const star2Base = 3000 + (zone - 1) * 500 + positionInZone * 50;
  const star3Base = star2Base * 1.75;
  const starThresholds: [number, number, number] = [
    0,
    Math.round(star2Base),
    Math.round(star3Base),
  ];

  const seed = levelId * 7919 + 42;
  const goal = pickGoal(levelId, zone, positionInZone);

  return {
    levelId,
    cols: 8,
    rows: 8,
    colorCount,
    moves,
    starThresholds,
    obstacleTypes,
    seed,
    goal,
    bottomBlockerZone,
  };
}

/**
 * Get all level configs for a zone (1-indexed zone number).
 */
export function getZoneLevels(zone: number): LevelConfig[] {
  const start = (zone - 1) * ZONE_SIZE + 1;
  return Array.from({ length: ZONE_SIZE }, (_, i) => getLevelConfig(start + i));
}
