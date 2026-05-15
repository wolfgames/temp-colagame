import type { Howl } from 'howler';
import type { AudioLoader } from '../assets/loaders/audio';
import type { SoundDefinition } from './types';
import { getRandomSound } from './utils';
import { audioState } from './state';

/**
 * Base Audio Manager
 *
 * Provides sound-effect and music playback using the scaffold AudioLoader
 * interface (aligned with the facade's `coordinator.audio`).
 *
 * Music supports fade-in / fade-out and pause / resume so toggling the
 * music switch does not restart the track from the beginning.
 *
 * Extend this class for game-specific audio management.
 *
 * @example
 * ```typescript
 * class MyGameAudioManager extends BaseAudioManager {
 *   playShoot(): void {
 *     this.playSound(SOUND_SHOOT);
 *   }
 * }
 * ```
 */
export abstract class BaseAudioManager {
  protected audioLoader: AudioLoader;
  protected currentMusicChannel: string | null = null;
  protected currentMusicId: number | null = null;
  protected currentMusicTrack: SoundDefinition | null = null;
  protected musicPaused: boolean = false;

  constructor(audioLoader: AudioLoader) {
    this.audioLoader = audioLoader;
  }

  protected playSound(sound: SoundDefinition): void {
    this.audioLoader.play(sound.channel, sound.sprite, {
      volume: sound.volume,
    });
  }

  protected playRandomSound(sounds: readonly SoundDefinition[]): void {
    const sound = getRandomSound(sounds);
    this.playSound(sound);
  }

  startMusic(track: SoundDefinition, fadeMs: number = 500): void {
    if (!audioState.musicEnabled()) return;

    this.stopMusic();
    const targetVolume = track.volume ?? 0.6;
    // Play at the target volume so the loader's Howl-wide default is correct.
    // Passing volume:0 here would leave the Howl's global volume at 0 even after
    // a per-id fade, silencing the music entirely.
    const id = this.audioLoader.play(track.channel, track.sprite, {
      volume: targetVolume,
    });
    this.currentMusicChannel = track.channel;
    this.currentMusicId = id;
    this.currentMusicTrack = track;
    this.musicPaused = false;

    if (id < 0) return;
    if (fadeMs > 0) {
      const howl = this.audioLoader.get<Howl>(track.channel);
      if (howl) {
        howl.volume(0, id);
        howl.fade(0, targetVolume, fadeMs, id);
      }
    }
  }

  pauseMusic(fadeMs: number = 300): void {
    if (this.currentMusicChannel === null || this.currentMusicId === null) return;
    if (this.musicPaused) return;
    if (!this.currentMusicTrack) return;
    const id = this.currentMusicId;
    const howl = this.audioLoader.get<Howl>(this.currentMusicChannel);
    if (!howl) {
      // No way to fade — pause immediately via stop fallback.
      this.audioLoader.stop(this.currentMusicChannel, id);
      this.musicPaused = true;
      return;
    }

    this.musicPaused = true;
    const startVolume = this.currentMusicTrack.volume ?? 0.6;
    if (fadeMs > 0) {
      howl.fade(startVolume, 0, fadeMs, id);
      // Defer pause until after fade completes; bail if music was re-enabled in the meantime.
      setTimeout(() => {
        if (this.musicPaused && this.currentMusicId === id) {
          howl.pause(id);
        }
      }, fadeMs);
    } else {
      howl.volume(0, id);
      howl.pause(id);
    }
  }

  resumeMusic(fadeMs: number = 300): void {
    if (this.currentMusicChannel === null || this.currentMusicId === null) return;
    if (!this.musicPaused) return;
    if (!this.currentMusicTrack) return;
    const id = this.currentMusicId;
    const howl = this.audioLoader.get<Howl>(this.currentMusicChannel);
    if (!howl) {
      // No way to resume by id — restart the track from scratch.
      this.musicPaused = false;
      const track = this.currentMusicTrack;
      this.startMusic(track, fadeMs);
      return;
    }

    const targetVolume = this.currentMusicTrack.volume ?? 0.6;
    this.musicPaused = false;
    howl.volume(0, id);
    howl.play(id);
    if (fadeMs > 0) {
      howl.fade(0, targetVolume, fadeMs, id);
    } else {
      howl.volume(targetVolume, id);
    }
  }

  stopMusic(): void {
    if (this.currentMusicChannel !== null && this.currentMusicId !== null) {
      this.audioLoader.stop(this.currentMusicChannel, this.currentMusicId);
    }
    this.currentMusicChannel = null;
    this.currentMusicId = null;
    this.currentMusicTrack = null;
    this.musicPaused = false;
  }

  isMusicPlaying(): boolean {
    return this.currentMusicId !== null && !this.musicPaused;
  }

  isMusicPaused(): boolean {
    return this.musicPaused;
  }
}
