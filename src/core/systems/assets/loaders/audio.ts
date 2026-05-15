/**
 * Audio playback interface consumed by BaseAudioManager.
 *
 * Aligned with the scaffold facade's `audio` object so that
 * `coordinator.audio` satisfies this interface directly.
 *
 * Higher-level concerns (music loops, fade-in/out) are handled by
 * BaseAudioManager, not the loader.
 */

export interface PlayOptions {
  volume?: number;
}

export interface AudioLoader {
  /** Play a sound sprite. Returns the Howl sound ID (or -1 if channel not loaded). */
  play(channel: string, sprite?: string, opts?: PlayOptions): number;
  /** Stop a sound (all sounds on a channel, or a specific ID). */
  stop(channel: string, id?: number): void;
  /** Set the global master volume (0–1). */
  setMasterVolume(volume: number): void;
  /** Get the underlying loaded asset (e.g. a Howl instance) by alias. */
  get<T = unknown>(alias: string): T | null;
}
