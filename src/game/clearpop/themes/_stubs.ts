/**
 * Shared stub content for theme placeholders.
 *
 * Non-eigenpop themes that don't ship their own copy of every Theme field
 * use these stubs so the contract is satisfied and the engine still has
 * usable fallbacks. Replace per-field when populating a real theme.
 */

import type {
  IntroSlide,
  ZoneBridgeSlide,
  RecipeSection,
} from '../contracts/theme';
import type { ObstacleType } from '../state/types';

export const STUB_INTRO_SLIDES: readonly IntroSlide[] = [
  { text: 'Welcome.', companionExpression: 'idle' },
];

export const STUB_ZONE_BRIDGES: Record<number, ZoneBridgeSlide> = {
  1: { title: 'Zone complete', body: 'Onward.' },
};

export const STUB_BLOCKER_NAMES: Record<ObstacleType, string> = {
  marshmallow: 'Blocker',
  egg:         'Blocker',
  ice:         'Blocker',
  jelly:       'Blocker',
  cage:        'Blocker',
  safe:        'Blocker',
  cookie:      'Blocker',
};

export const STUB_FALLBACK_RECIPE: RecipeSection = {
  dishName: '',
  dishImage: '',
  nanaOpeningLine: '',
  nanaClosingLine: '',
};
