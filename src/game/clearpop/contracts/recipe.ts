/**
 * Recipe Contract
 *
 * A Recipe is the per-level parameter pack driven by the standard difficulty
 * curve. Recipes parameterise board dimensions, color count, blocker count,
 * move budget, and power-up tuning. The topology id is set once per Variant,
 * not per recipe.
 *
 * For Step 1 we alias the existing `LevelConfig` so the new contracts compile
 * without touching the live state types. Step 2 introduces cell-id awareness
 * inside the LevelConfig shape.
 */

import type { LevelConfig } from '../state/types';

export type Recipe = LevelConfig;
