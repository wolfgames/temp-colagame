// Pixi.js renderer (default)
export { SpriteButton, type SpriteButtonConfig } from './renderers/pixi';

// Phaser renderer
export { PhaserSpriteButton, type PhaserSpriteButtonConfig } from './renderers/phaser';

// Three.js renderer
export { ThreeSpriteButton, type ThreeSpriteButtonConfig } from './renderers/three';

// Shared defaults & tuning
export { SPRITE_BUTTON_DEFAULTS } from './defaults';
export { spriteButtonTuning } from './tuning';
