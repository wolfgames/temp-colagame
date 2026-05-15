import { SPRITE_BUTTON_DEFAULTS } from './defaults';

export const spriteButtonTuning = {
  name: 'Sprite Button',
  defaults: SPRITE_BUTTON_DEFAULTS,
  schema: {
    hoverScale: { type: 'number', min: 1.0, max: 1.3, step: 0.01 },
    pressScale: { type: 'number', min: 0.7, max: 1.0, step: 0.01 },
    pressDuration: { type: 'number', min: 0, max: 0.5, step: 0.01 },
    hoverDuration: { type: 'number', min: 0, max: 0.5, step: 0.01 },
    exitScale: { type: 'number', min: 0.5, max: 1.0, step: 0.01 },
    exitDuration: { type: 'number', min: 0, max: 1.0, step: 0.01 },
    disabledAlpha: { type: 'number', min: 0, max: 1, step: 0.05 },
    ease: { type: 'string' },
  },
} as const;
