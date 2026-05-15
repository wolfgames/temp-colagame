import { CHARACTER_SPRITE_DEFAULTS } from './defaults';

export const characterSpriteTuning = {
  name: 'Character Sprite',
  defaults: CHARACTER_SPRITE_DEFAULTS,
  schema: {
    anchor: { type: 'number', min: 0, max: 1, step: 0.1 },
    scale: { type: 'number', min: 0.1, max: 3, step: 0.1 },
  },
} as const;
