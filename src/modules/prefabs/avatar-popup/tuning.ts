import { AVATAR_POPUP_DEFAULTS } from './defaults';

export const avatarPopupTuning = {
  name: 'Avatar Popup',
  defaults: AVATAR_POPUP_DEFAULTS,
  schema: {
    circleSize: { type: 'number', min: 32, max: 128, step: 4 },
    borderWidth: { type: 'number', min: 0, max: 10, step: 1 },
    borderColor: { type: 'color' },
    dialogWidth: { type: 'number', min: 150, max: 400, step: 10 },
    dialogGap: { type: 'number', min: 0, max: 24, step: 2 },
    dialogMinHeight: { type: 'number', min: 40, max: 120, step: 5 },
    fontSize: { type: 'number', min: 10, max: 24, step: 1 },
    lineHeight: { type: 'number', min: 14, max: 36, step: 1 },
    showScaleDuration: { type: 'number', min: 0.1, max: 1, step: 0.05 },
    showFadeDuration: { type: 'number', min: 0.05, max: 0.5, step: 0.05 },
    hideDuration: { type: 'number', min: 0.05, max: 0.5, step: 0.05 },
    hideScale: { type: 'number', min: 0.5, max: 1, step: 0.05 },
    gridSpacing: { type: 'number', min: 0, max: 40, step: 2 },
  },
} as const;
