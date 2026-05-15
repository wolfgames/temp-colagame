import { PROGRESS_BAR_DEFAULTS } from './defaults';

export const progressBarTuning = {
  name: 'Progress Bar',
  defaults: PROGRESS_BAR_DEFAULTS,
  schema: {
    width: { type: 'number', min: 100, max: 600, step: 10 },
    height: { type: 'number', min: 20, max: 80, step: 2 },
    fillColor: { type: 'color' },
    milestoneColor: { type: 'color' },
    backgroundColor: { type: 'color' },
    borderWidth: { type: 'number', min: 0, max: 10, step: 1 },
    radius: { type: 'number', min: 0, max: 20, step: 1 },
    dotRadius: { type: 'number', min: 2, max: 12, step: 1 },
    animationDuration: { type: 'number', min: 0, max: 2, step: 0.1 },
  },
} as const;
