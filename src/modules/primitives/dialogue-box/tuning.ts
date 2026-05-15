import { DIALOGUE_BOX_DEFAULTS } from './defaults';

export const dialogueBoxTuning = {
  name: 'Dialogue Box',
  defaults: DIALOGUE_BOX_DEFAULTS,
  schema: {
    nineSliceBorder: { type: 'number', min: 5, max: 50, step: 1 },
    fontSize: { type: 'number', min: 10, max: 32, step: 1 },
    lineHeight: { type: 'number', min: 14, max: 40, step: 1 },
    textPadding: { type: 'number', min: 10, max: 80, step: 5 },
    baseHeight: { type: 'number', min: 40, max: 200, step: 5 },
    minHeight: { type: 'number', min: 40, max: 200, step: 5 },
    verticalPadding: { type: 'number', min: 10, max: 80, step: 5 },
  },
} as const;
