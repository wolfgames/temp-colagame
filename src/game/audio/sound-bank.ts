/**
 * Sound Bank — semantic sound descriptors.
 *
 * A theme-agnostic mapping from gameplay events (pop, reject, win, …) to
 * SoundDefinition objects. The GameAudioManager consumes one of these
 * instead of hardcoding sound references, so variants can swap audio by
 * supplying a different bank.
 *
 * Themes declare their audio at the contract level via
 * `Theme.audio.bundles + per-event SoundRef`. `createSoundBankFromTheme`
 * resolves each SoundRef against the theme's bundles, producing the
 * SoundDefinitions the audio manager plays. Themes that omit `bundles`
 * fall back to the eigenpop bundles, so an existing theme that only
 * supplies sprite names still works against the canonical sprite sheet.
 */

import type { SoundDefinition } from '~/core/systems/audio';
import type { AudioBank as ThemeAudioBank, SoundRef } from '../clearpop/contracts/theme';
import {
  MUSIC_GAME,
  SOUND_BUTTON_CLICK,
  SOUND_POP,
  SOUND_REJECT,
  SOUND_BLOCKER_HIT,
  SOUND_BLOCKER_CLEAR,
  SOUND_POWERUP_SPAWN,
  SOUND_ROCKET,
  SOUND_BOMB,
  SOUND_COLOR_BLAST,
  SOUND_COMBO,
  SOUND_WIN,
  SOUND_LOSE,
  SOUND_MARSHMALLOW_BURN,
} from './sounds';

export interface SoundBank {
  /** Channel/bundle aliases — informational, used by the asset coordinator. */
  channels: { sfx: string; music: string };

  music: {
    menu?: SoundDefinition;
    game: SoundDefinition;
  };

  sfx: {
    pop: SoundDefinition;
    reject: SoundDefinition;
    blockerHit: SoundDefinition;
    blockerClear: SoundDefinition;
    powerUpSpawn: SoundDefinition;
    rocket: SoundDefinition;
    bomb: SoundDefinition;
    colorBlast: SoundDefinition;
    combo: SoundDefinition;
    win: SoundDefinition;
    lose: SoundDefinition;
    marshmallowBurn: SoundDefinition;
    buttonClick: SoundDefinition;
  };
}

const EIGENPOP_SFX_CHANNEL = 'audio-sfx-clearpop';
const EIGENPOP_MUSIC_CHANNEL = 'audio-music-clearpop';

/**
 * The eigenpop `theme.audio` block, exported so themes that ship without
 * their own audio bundles can reuse the canonical sprite-name → event
 * mapping. Sprite names match the keys inside
 * `public/assets/sfx-clearpop.json` and `public/assets/music-clearpop.json`.
 */
export const EIGENPOP_THEME_AUDIO: ThemeAudioBank = {
  music: {
    game: { sprite: 'music_game' },
  },
  sfx: {
    pop:          { sprite: 'pop' },
    reject:       { sprite: 'reject_thud' },
    blockerHit:   { sprite: 'blocker_hit' },
    blockerClear: { sprite: 'blocker_clear' },
    powerUpSpawn: { sprite: 'powerup_spawn' },
    rocket:       { sprite: 'rocket_whoosh' },
    bomb:         { sprite: 'bomb_blast' },
    colorBlast:   { sprite: 'color_blast' },
    combo:        { sprite: 'combo_blast' },
    win:          { sprite: 'win_stinger' },
    lose:         { sprite: 'lose_stinger' },
  },
};

/**
 * The canonical eigenpop sound bank — points at the existing audio sprites
 * that ship with the cozy-kitchen variant. Used as the fallback when a
 * theme's bundle hasn't been registered or its `audio` section is missing
 * a key.
 */
export const EIGENPOP_SOUND_BANK: SoundBank = {
  channels: { sfx: EIGENPOP_SFX_CHANNEL, music: EIGENPOP_MUSIC_CHANNEL },
  music: { game: MUSIC_GAME },
  sfx: {
    pop: SOUND_POP,
    reject: SOUND_REJECT,
    blockerHit: SOUND_BLOCKER_HIT,
    blockerClear: SOUND_BLOCKER_CLEAR,
    powerUpSpawn: SOUND_POWERUP_SPAWN,
    rocket: SOUND_ROCKET,
    bomb: SOUND_BOMB,
    colorBlast: SOUND_COLOR_BLAST,
    combo: SOUND_COMBO,
    win: SOUND_WIN,
    lose: SOUND_LOSE,
    marshmallowBurn: SOUND_MARSHMALLOW_BURN,
    buttonClick: SOUND_BUTTON_CLICK,
  },
};

/**
 * Resolve a theme SoundRef into a runtime SoundDefinition.
 * `ref.channel` overrides the bank-wide default channel; missing volume
 * falls back to the event's class-level default.
 */
function resolveRef(
  ref: SoundRef,
  defaultChannel: string,
  defaultVolume: number,
): SoundDefinition {
  return {
    channel: ref.channel ?? defaultChannel,
    sprite: ref.sprite,
    volume: ref.volume ?? defaultVolume,
  };
}

/**
 * Build a SoundBank from a Theme's `audio` field. Default channels come
 * from `audio.bundles` if declared; missing entries fall through to the
 * eigenpop bundles so partial themes still produce a playable bank.
 *
 * Events the engine plays but the theme doesn't break out (button click,
 * marshmallow burn) reuse the closest semantic SoundRef.
 */
export function createSoundBankFromTheme(audio: ThemeAudioBank): SoundBank {
  const sfxCh = audio.bundles?.sfx ?? EIGENPOP_SFX_CHANNEL;
  const musicCh = audio.bundles?.music ?? EIGENPOP_MUSIC_CHANNEL;

  const sfx = (ref: SoundRef, vol = 0.7): SoundDefinition => resolveRef(ref, sfxCh, vol);
  const music = (ref: SoundRef, vol = 0.45): SoundDefinition => resolveRef(ref, musicCh, vol);

  return {
    channels: { sfx: sfxCh, music: musicCh },
    music: {
      menu: audio.music.menu ? music(audio.music.menu) : undefined,
      game: music(audio.music.game),
    },
    sfx: {
      pop:             sfx(audio.sfx.pop, 0.6),
      reject:          sfx(audio.sfx.reject, 0.5),
      blockerHit:      sfx(audio.sfx.blockerHit, 0.6),
      blockerClear:    sfx(audio.sfx.blockerClear, 0.7),
      powerUpSpawn:    sfx(audio.sfx.powerUpSpawn, 0.7),
      rocket:          sfx(audio.sfx.rocket, 0.7),
      bomb:            sfx(audio.sfx.bomb, 0.8),
      colorBlast:      sfx(audio.sfx.colorBlast, 0.85),
      combo:           sfx(audio.sfx.combo, 0.9),
      win:             sfx(audio.sfx.win, 0.8),
      lose:            sfx(audio.sfx.lose, 0.7),
      // The engine plays these via the same channel as small pops — they
      // share an audio profile across every theme so we don't require
      // dedicated theme slots for them.
      marshmallowBurn: sfx(audio.sfx.blockerHit, 0.7),
      buttonClick:     sfx(audio.sfx.blockerHit, 0.7),
    },
  };
}
