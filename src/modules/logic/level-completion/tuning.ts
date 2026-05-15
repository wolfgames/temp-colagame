import { LEVEL_COMPLETION_DEFAULTS } from './defaults';

export const levelCompletionTuning = {
  name: 'Level Completion',
  defaults: LEVEL_COMPLETION_DEFAULTS,
  schema: {
    celebrationDuration: { type: 'number', min: 0, max: 2000, step: 100 },
    clueDuration: { type: 'number', min: 1000, max: 10000, step: 500 },
    chimeVolume: { type: 'number', min: 0, max: 1, step: 0.05 },
    chimeDuration: { type: 'number', min: 0.1, max: 2, step: 0.1 },
  },
} as const;
