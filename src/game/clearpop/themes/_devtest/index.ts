/**
 * Dev-test stub theme.
 *
 * Minimal Theme implementation with placeholder strings and asset keys.
 * Used to validate that the theme abstraction handles real divergence
 * (different palette, different companion, different copy) — pointing the
 * runtime at this theme should produce a game that runs but looks/sounds
 * wrong, proving the decoupling works.
 */

import type { Theme } from '../../contracts/theme';
import { EIGENPOP_THEME_AUDIO } from '~/game/audio/sound-bank';
import {
  STUB_INTRO_SLIDES,
  STUB_ZONE_BRIDGES,
  STUB_BLOCKER_NAMES,
  STUB_FALLBACK_RECIPE,
} from '../_stubs';

const STRINGS: Theme['strings'] = {
  start: {
    title:   'DEVTEST',
    tagline: 'topology + theme harness',
    play:    'Start',
    loading: 'Loading…',
  },
  intro: { eyebrow: 'DEVTEST', title: 'topology harness' },
  win: {
    title:    'Level cleared',
    nextLevel: 'Next',
    mainMenu: 'Home',
  },
  loss: {
    title:    'No moves',
    retry:    'Retry',
    mainMenu: 'Home',
    encouragement: ['Try again.', 'One more.'] as const,
  },
  interstitial: { continue: 'Continue' },
  hud: {
    ariaLoading:    'Devtest loading',
    ariaOutOfMoves: 'Out of moves',
    skipDebug:      'SKIP',
  },
};

export const devtestTheme: Theme = {
  id: '_devtest',
  displayName: 'Devtest',

  blocks: {
    slots: {
      a: { kindName: 'Alpha', spriteKey: 'devtest_a', tint: '#00ffff' },
      b: { kindName: 'Beta',  spriteKey: 'devtest_b', tint: '#ff00ff' },
      c: { kindName: 'Gamma', spriteKey: 'devtest_c', tint: '#ffff00' },
    },
  },

  blocker: {
    displayName: 'Block',
    spriteKey: 'devtest_blocker',
  },

  powerups: {
    line:  { displayName: 'Line',  spriteKey: 'devtest_line',  vfxKey: 'devtest_vfx_line' },
    area:  { displayName: 'Area',  spriteKey: 'devtest_area',  vfxKey: 'devtest_vfx_area' },
    color: { displayName: 'Color', spriteKey: 'devtest_color', vfxKey: 'devtest_vfx_color' },
  },

  background: { spriteKey: 'devtest_bg' },
  frame:      { spriteKey: 'devtest_frame' },
  particles:  { popKey: 'devtest_pop', refillKey: 'devtest_refill', comboKey: 'devtest_combo' },

  // No devtest bundle — fall through to the eigenpop bank so smoke tests
  // still hear something audible.
  audio: EIGENPOP_THEME_AUDIO,

  companion: {
    name: 'DEV',
    spriteKeys: {
      idle:      'devtest_companion_idle',
      happy:     'devtest_companion_happy',
      sad:       'devtest_companion_sad',
      surprised: 'devtest_companion_surprised',
    },
    voiceProfile: 'neutral, robotic, debug-friendly',
  },

  zones: [],
  strings: STRINGS,

  introSlides: STUB_INTRO_SLIDES,
  zoneBridgeSlides: STUB_ZONE_BRIDGES,
  blockerDisplayNames: STUB_BLOCKER_NAMES,
  fallbackRecipe: STUB_FALLBACK_RECIPE,
};

export default devtestTheme;
