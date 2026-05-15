export const LEVEL_COMPLETION_DEFAULTS = {
  /** Delay before showing companion (ms) */
  celebrationDuration: 500,
  /** How long clue text is displayed (ms) */
  clueDuration: 3000,
  /** Chime frequencies — ascending C5 → E5 → G5 */
  chimeFrequencies: [523.25, 659.25, 783.99] as readonly number[],
  /** Chime note spacing (seconds) */
  chimeNoteSpacing: 0.1,
  /** Chime initial volume */
  chimeVolume: 0.3,
  /** Chime total duration (seconds) */
  chimeDuration: 0.5,
};
