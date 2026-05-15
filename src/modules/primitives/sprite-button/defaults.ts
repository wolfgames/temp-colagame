export const SPRITE_BUTTON_DEFAULTS = {
  /** Scale when pressed */
  pressScale: 0.95,
  /** Scale on hover */
  hoverScale: 1.05,
  /** Press animation duration (seconds) */
  pressDuration: 0.1,
  /** Hover animation duration (seconds) */
  hoverDuration: 0.2,
  /** Exit animation scale */
  exitScale: 0.9,
  /** Exit animation duration (seconds) */
  exitDuration: 0.25,
  /** Disabled state alpha */
  disabledAlpha: 0.5,
  /** Animation easing */
  ease: 'power2.out',
  /** Default label font size */
  labelFontSize: 18,
  /** Default label font weight */
  labelFontWeight: 'bold' as const,
  /** Default label fill color */
  labelFill: 0x000000,
};
