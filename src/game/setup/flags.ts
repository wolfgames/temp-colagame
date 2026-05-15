import { registerFlagConfig } from '~/core/systems/feature-flags';
import { getUserData } from './helper';

// ============================================================================
// GAME-SPECIFIC FLAG TYPES
// ============================================================================

export type DifficultyVariant = 'easy_start' | 'medium_start' | 'hard_start';
export type ClueDisplayTime = '2s' | '3s' | '5s';

export interface GameFeatureFlags {
  difficulty_curve_variant: DifficultyVariant;
  county_theming_enabled: boolean;
  clue_display_time: ClueDisplayTime;
  clue_overlay_enabled: boolean;
}

// ============================================================================
// DEFAULTS & VALIDATORS
// ============================================================================

export const DEFAULT_FLAGS: GameFeatureFlags = {
  difficulty_curve_variant: 'medium_start',
  county_theming_enabled: false,
  clue_display_time: '3s',
  clue_overlay_enabled: false,
};

function isDifficultyVariant(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['easy_start', 'medium_start', 'hard_start'].includes(value)
  );
}

function isClueDisplayTime(value: unknown): boolean {
  return typeof value === 'string' && ['2s', '3s', '5s'].includes(value);
}

const VALIDATORS: Partial<Record<keyof GameFeatureFlags, (v: unknown) => boolean>> = {
  difficulty_curve_variant: isDifficultyVariant,
  clue_display_time: isClueDisplayTime,
};

// ============================================================================
// REGISTRATION (runs at module load)
// storagePrefix is resolved by FeatureFlagProvider from GameConfigProvider
// ============================================================================

const { uid } = getUserData();

registerFlagConfig<GameFeatureFlags>({
  defaults: DEFAULT_FLAGS,
  validators: VALIDATORS,
  userId: uid,
});
