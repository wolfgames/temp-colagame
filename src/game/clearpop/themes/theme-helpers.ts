/**
 * Theme-agnostic content helpers.
 *
 * Pure functions that operate on the Theme contract. Engine modules call
 * these instead of importing helpers from a specific theme so swapping the
 * active variant swaps every player-visible string.
 */

import type {
  Theme,
  ThemeDialogueStep,
  RecipeSection,
  ZoneBridgeSlide,
  CompanionExpression,
} from '../contracts/theme';
import type { ObstacleType } from '../state/types';

const DEFAULT_BLOCKER_PRIORITY: readonly ObstacleType[] = [
  'egg',
  'cookie',
  'marshmallow',
  'safe',
  'jelly',
  'cage',
  'ice',
];

const FALLBACK_BRIDGE: ZoneBridgeSlide = {
  title: 'Zone complete',
  body: 'Onward.',
};

/** Sorted blocker-set key used to index `Theme.recipeSections`. */
export function recipeKeyForBlockers(blockers: readonly ObstacleType[]): string {
  return [...blockers].sort().join(',');
}

/**
 * Look up the recipe for the upcoming section. Falls back to
 * `theme.fallbackRecipe` when the theme doesn't ship a matching section.
 */
export function getRecipeForBlockers(
  theme: Theme,
  blockers: readonly ObstacleType[],
): RecipeSection {
  const key = recipeKeyForBlockers(blockers);
  return theme.recipeSections?.[key] ?? theme.fallbackRecipe;
}

/**
 * Pick a blocker quip for the level, or null if the theme has no quip
 * lines for any of the present obstacle types. Deterministic — uses level
 * number to choose the line so the same level shows the same quip.
 */
export function getBlockerQuip(
  theme: Theme,
  presentTypes: readonly ObstacleType[],
  level: number,
): ThemeDialogueStep | null {
  const quips = theme.blockerQuips;
  if (!quips) return null;

  const priority = theme.blockerQuipPriority ?? DEFAULT_BLOCKER_PRIORITY;
  const chosen = priority.find((t) => presentTypes.includes(t) && quips[t]?.length);
  if (!chosen) return null;

  const lines = quips[chosen];
  if (!lines || lines.length === 0) return null;

  const idx = level % lines.length;
  const line = lines[idx]!;
  return {
    speaker: 'nana',
    image: companionImageFor(theme, line.expression),
    message: line.message,
  };
}

/**
 * Bridge slide shown between zones on the results screen. Falls back to
 * the first zone's bridge if the requested zone is missing, then to a
 * generic stub if the theme has no bridges at all.
 */
export function getZoneBridgeSlide(theme: Theme, zone: number): ZoneBridgeSlide {
  const bridges = theme.zoneBridgeSlides;
  return bridges[zone] ?? bridges[1] ?? FALLBACK_BRIDGE;
}

/**
 * Companion portrait URL for the given expression — defaults to `idle`
 * when the requested key is missing. With `CompanionExpression` widened to
 * `string`, this is the safety net: a typo or a narrative-invented name
 * that the theme didn't generate art for silently falls back to the
 * `idle` portrait. In dev builds we log the miss once per (theme, name)
 * pair so authors notice unwired expressions without flooding the console.
 */
const warnedExpressionMisses = new Set<string>();

export function companionImageFor(
  theme: Theme,
  expression: CompanionExpression | undefined,
): string {
  const keys = theme.companion.spriteKeys;
  const name = expression ?? 'idle';
  const hit = keys[name];
  if (hit) return hit;
  if (import.meta.env?.DEV) {
    const tag = `${theme.id}:${name}`;
    if (!warnedExpressionMisses.has(tag)) {
      warnedExpressionMisses.add(tag);
      console.warn(
        `[theme] companion expression "${name}" not found in theme "${theme.id}". Falling back to idle. Known: ${Object.keys(keys).join(', ')}`,
      );
    }
  }
  return keys.idle;
}

/**
 * Returns the per-slide companion portraits for the intro interstitial,
 * one URL per slide. Pads to the slide count using the idle portrait.
 */
export function getIntroCompanionImages(theme: Theme): string[] {
  return theme.introSlides.map((slide) =>
    companionImageFor(theme, slide.companionExpression),
  );
}
