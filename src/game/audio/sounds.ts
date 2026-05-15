/**
 * Sound Catalog — ClearPop
 *
 * Sound effects and music definitions.
 * Bundle: audio-sfx-clearpop (add to asset-manifest.ts when audio assets exist).
 */

import type { SoundDefinition } from '~/core/systems/audio';

export type { SoundDefinition };

const SFX   = 'audio-sfx-clearpop';
const MUSIC = 'audio-music-clearpop';

export const MUSIC_GAME: SoundDefinition = {
  channel: MUSIC,
  sprite: 'music_game',
  volume: 0.45,
};

export const SOUND_POP: SoundDefinition = {
  channel: SFX,
  sprite: 'pop',
  volume: 0.6,
};

export const SOUND_REJECT: SoundDefinition = {
  channel: SFX,
  sprite: 'reject_thud',
  volume: 0.5,
};

export const SOUND_BLOCKER_HIT: SoundDefinition = {
  channel: SFX,
  sprite: 'blocker_hit',
  volume: 0.6,
};

export const SOUND_BLOCKER_CLEAR: SoundDefinition = {
  channel: SFX,
  sprite: 'blocker_clear',
  volume: 0.7,
};

export const SOUND_POWERUP_SPAWN: SoundDefinition = {
  channel: SFX,
  sprite: 'powerup_spawn',
  volume: 0.7,
};

export const SOUND_ROCKET: SoundDefinition = {
  channel: SFX,
  sprite: 'rocket_whoosh',
  volume: 0.7,
};

export const SOUND_BOMB: SoundDefinition = {
  channel: SFX,
  sprite: 'bomb_blast',
  volume: 0.8,
};

export const SOUND_COLOR_BLAST: SoundDefinition = {
  channel: SFX,
  sprite: 'color_blast',
  volume: 0.85,
};

export const SOUND_COMBO: SoundDefinition = {
  channel: SFX,
  sprite: 'combo_blast',
  volume: 0.9,
};

export const SOUND_WIN: SoundDefinition = {
  channel: SFX,
  sprite: 'win_stinger',
  volume: 0.8,
};

export const SOUND_LOSE: SoundDefinition = {
  channel: SFX,
  sprite: 'lose_stinger',
  volume: 0.7,
};

export const SOUND_MARSHMALLOW_BURN: SoundDefinition = {
  channel: SFX,
  sprite: 'marshmallow_burn',
  volume: 0.7,
};

export const SOUND_BUTTON_CLICK: SoundDefinition = {
  channel: SFX,
  sprite: 'button_click',
  volume: 0.7,
};
