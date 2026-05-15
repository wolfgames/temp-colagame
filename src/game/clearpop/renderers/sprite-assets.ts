/**
 * Sprite Asset Loader
 *
 * Preloads all ClearPop sprite textures so they're available
 * synchronously for obstacle and power-up rendering.
 */

import { Assets, type Texture } from 'pixi.js';
import type { ObstacleType, PowerUpType } from '../state/types';
import type { SpriteOverrides } from '../contracts/theme';

/**
 * Per-obstacle size multiplier relative to a uniform tile/icon box.
 * Different sprites have different amounts of padding in their source art —
 * these multipliers make all obstacles read as visually the same size.
 * Shared by BoardRenderer (tile scaling) and HudRenderer (icon scaling).
 */
export const OBSTACLE_VISUAL_SCALE: Record<ObstacleType, number> = {
  marshmallow: 1.05,
  egg:         1.2,
  ice:         1.1,
  jelly:       1.1,
  cage:        1.1,
  safe:        1.1,
  cookie:      1.35,
};

const THEME = 'generic';

const OBSTACLE_SPRITE_PATHS: Record<string, string> = {
  base_block: '/assets/sprites/block-base-pale-128.png',
  base_block_blue:   '/assets/sprites/block-base-blue-128.png',
  base_block_red:    '/assets/sprites/block-base-red-128.png',
  base_block_yellow: '/assets/sprites/block-base-yellow-128.png',
  marshmallow: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-marshmallow-128.png`,
  marshmallow_toasted: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-marshmallow-toasted-128.png`,
  egg_2: `/assets/sprites/${THEME}/block-obstacle-egg-128.png`,
  egg_1: `/assets/sprites/${THEME}/block-obstacle-egg-cracked-128.png`,
  egg_nest: `/assets/sprites/${THEME}/block-obstacle-egg-nest-128.png`,
  ice_3: `/assets/sprites/${THEME}/block-obstacle-ice-128.png`,
  ice_2: `/assets/sprites/${THEME}/block-obstacle-ice-cracked-128.png`,
  ice_1: `/assets/sprites/${THEME}/block-obstacle-ice-shattered-128.png`,
  jelly: `/assets/sprites/${THEME}/block-obstacle-jelly-128.png`,
  cage: `/assets/sprites/${THEME}/block-rock-stone-128.png`,
  safe: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-safe-128.png`,
  cookie_3: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-cookie-128.png`,
  cookie_2: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-cookie-bite1-128.png`,
  cookie_1: `/assets/sprites/cozy-kitchen/blockers/block-obstacle-cookie-bite2-128.png`,
};

const POWERUP_SPRITE_PATHS: Record<PowerUpType, string> = {
  rocket: `/assets/sprites/cozy-kitchen/powerups/powerup-rocket.png`,
  bomb: `/assets/sprites/cozy-kitchen/powerups/powerup-bomb.png`,
  color_blast: `/assets/sprites/cozy-kitchen/powerups/powerup-rubiks.png`,
};

const PARTICLE_SPRITE_PATHS: Record<string, string> = {
  popcorn_1: '/assets/sprites/cozy-kitchen/particles/popcorn-1.png',
  popcorn_2: '/assets/sprites/cozy-kitchen/particles/popcorn-2.png',
  popcorn_3: '/assets/sprites/cozy-kitchen/particles/popcorn-3.png',
  fire_1: '/assets/sprites/cozy-kitchen/particles/fire-1.png',
  fire_2: '/assets/sprites/cozy-kitchen/particles/fire-2.png',
  fire_3: '/assets/sprites/cozy-kitchen/particles/fire-3.png',
};

const DISH_BASE = '/assets/sprites/cozy-kitchen/dishes/';
const DISH_SPRITE_PATHS: Record<string, string> = {
  'dish-honey-cake':        `${DISH_BASE}dish-honey-cake.png`,
  'dish-celebration-tart':  `${DISH_BASE}dish-celebration-tart.png`,
  'dish-truce-shortbread':  `${DISH_BASE}dish-truce-shortbread.png`,
  'dish-marshmallow-cocoa': `${DISH_BASE}dish-marshmallow-cocoa.png`,
  'dish-charm-cake':        `${DISH_BASE}dish-charm-cake.png`,
  'dish-jam-roll':          `${DISH_BASE}dish-jam-roll.png`,
  'dish-pumpkin-loaf':      `${DISH_BASE}dish-pumpkin-loaf.png`,
  'dish-wedding-cake':      `${DISH_BASE}dish-wedding-cake.png`,
  'dish-rose-macarons':     `${DISH_BASE}dish-rose-macarons.png`,
  'dish-teaching-cookies':  `${DISH_BASE}dish-teaching-cookies.png`,
};

export interface SpriteTextures {
  obstacles: Map<string, Texture>;
  powerups: Map<PowerUpType, Texture>;
  particles: Map<string, Texture>;
  hudBanner: Texture | null;
  starBar: Texture | null;
  background: Texture | null;
  frame: Texture | null;
  /**
   * Per-zone background textures, keyed by zone number. Empty when the
   * theme doesn't declare `background.perZone`. The renderer falls back to
   * `background` for any zone missing from this map.
   */
  perZoneBackgrounds: Map<number, Texture>;
}

const ALL_MANAGED_PATHS: string[] = [
  ...Object.values(OBSTACLE_SPRITE_PATHS),
  ...Object.values(POWERUP_SPRITE_PATHS),
  ...Object.values(PARTICLE_SPRITE_PATHS),
  ...Object.values(DISH_SPRITE_PATHS),
  '/assets/sprites/cozy-kitchen/hud-banner.png',
  '/assets/sprites/cozy-kitchen/star-bar.png',
];

/**
 * Evict all sprite textures from Pixi's asset cache so the next
 * loadSpriteAssets() re-fetches from disk. Called automatically
 * before loading in dev mode so HMR picks up replaced PNGs.
 *
 * Pass additional dynamic paths (theme background/frame) so they
 * also re-fetch when the variant or override changes.
 */
export async function unloadSpriteAssets(extraPaths: readonly string[] = []): Promise<void> {
  for (const path of [...ALL_MANAGED_PATHS, ...extraPaths]) {
    if (Assets.cache.has(path)) {
      await Assets.unload(path);
    }
  }
}

/**
 * Apply theme overrides to a base sprite path. Override map is keyed by
 * the logical sprite id (e.g. `base_block_blue`); when present its value
 * replaces the eigenpop default path, otherwise the default is used.
 */
function resolvePath(
  key: string,
  basePath: string,
  overrides: SpriteOverrides | undefined,
): string {
  return overrides?.[key] ?? basePath;
}

export interface ThemeScenePaths {
  /** Theme-declared background sprite path. Overridable via `spriteOverrides.background`. */
  background: string;
  /** Theme-declared frame sprite path. Overridable via `spriteOverrides.frame`. */
  frame: string;
  /**
   * Optional per-zone background sprite paths (zone number → asset path).
   * The renderer swaps to the matching texture when the zone changes;
   * missing zones fall back to `background`.
   */
  perZoneBackgrounds?: Record<number, string>;
}

export async function loadSpriteAssets(
  overrides?: SpriteOverrides,
  themePaths?: ThemeScenePaths,
): Promise<SpriteTextures> {
  const backgroundPath = themePaths ? resolvePath('background', themePaths.background, overrides) : null;
  const framePath      = themePaths ? resolvePath('frame',      themePaths.frame,      overrides) : null;
  const perZoneEntries: { zone: number; path: string }[] = themePaths?.perZoneBackgrounds
    ? Object.entries(themePaths.perZoneBackgrounds).map(([zone, path]) => ({
        zone: Number(zone),
        path: resolvePath(`background-zone-${zone}`, path, overrides),
      }))
    : [];

  if (import.meta.env.DEV) {
    const extras: string[] = [];
    if (backgroundPath) extras.push(backgroundPath);
    if (framePath)      extras.push(framePath);
    for (const { path } of perZoneEntries) extras.push(path);
    await unloadSpriteAssets(extras);
  }

  const obstacles = new Map<string, Texture>();
  const powerups = new Map<PowerUpType, Texture>();
  const particles = new Map<string, Texture>();
  let hudBanner: Texture | null = null;

  const allPaths = [
    ...Object.entries(OBSTACLE_SPRITE_PATHS).map(([key, path]) => ({ key, path: resolvePath(key, path, overrides), group: 'obstacle' as const })),
    ...Object.entries(POWERUP_SPRITE_PATHS).map(([key, path]) => ({ key, path: resolvePath(key, path, overrides), group: 'powerup' as const })),
    ...Object.entries(PARTICLE_SPRITE_PATHS).map(([key, path]) => ({ key, path: resolvePath(key, path, overrides), group: 'particle' as const })),
    ...Object.entries(DISH_SPRITE_PATHS).map(([key, path]) => ({ key, path: resolvePath(key, path, overrides), group: 'dish' as const })),
  ];

  let starBar: Texture | null = null;

  const bannerPath  = resolvePath('hud-banner', '/assets/sprites/cozy-kitchen/hud-banner.png', overrides);
  const starBarPath = resolvePath('star-bar',   '/assets/sprites/cozy-kitchen/star-bar.png',   overrides);

  const [results, bannerTex, starBarTex, backgroundTex, frameTex, perZoneResults] = await Promise.all([
    Promise.all(
      allPaths.map(async ({ key, path, group }) => {
        const texture = await Assets.load<Texture>(path);
        return { key, texture, group };
      }),
    ),
    Assets.load<Texture>(bannerPath).catch(() => null),
    Assets.load<Texture>(starBarPath).catch(() => null),
    backgroundPath ? Assets.load<Texture>(backgroundPath).catch(() => null) : Promise.resolve(null),
    framePath      ? Assets.load<Texture>(framePath).catch(() => null)      : Promise.resolve(null),
    Promise.all(
      perZoneEntries.map(async ({ zone, path }) => {
        const texture = await Assets.load<Texture>(path).catch(() => null);
        return { zone, texture };
      }),
    ),
  ]);

  hudBanner = bannerTex;
  starBar = starBarTex;

  const perZoneBackgrounds = new Map<number, Texture>();
  for (const { zone, texture } of perZoneResults) {
    if (texture) perZoneBackgrounds.set(zone, texture);
  }

  for (const { key, texture, group } of results) {
    if (group === 'obstacle') {
      obstacles.set(key, texture);
    } else if (group === 'powerup') {
      powerups.set(key as PowerUpType, texture);
    } else if (group === 'particle') {
      particles.set(key, texture);
    }
    // 'dish' textures are primed into Pixi's asset cache only;
    // interstitials retrieve them via Assets.load() which resolves instantly.
  }

  return {
    obstacles, powerups, particles, hudBanner, starBar,
    background: backgroundTex, frame: frameTex,
    perZoneBackgrounds,
  };
}

export function getObstacleTextureKey(type: ObstacleType, hp: number, maxHp?: number): string {
  if (type === 'egg') return hp >= 2 ? 'egg_2' : 'egg_1';
  if (type === 'ice') {
    if (hp >= 3) return 'ice_3';
    if (hp === 2) return 'ice_2';
    return 'ice_1';
  }
  if (type === 'cookie') {
    if (hp >= 3) return 'cookie_3';
    if (hp === 2) return 'cookie_2';
    return 'cookie_1';
  }
  if (type === 'marshmallow') return 'marshmallow';
  return type;
}
