import { Sprite } from 'pixi.js';
import type { PixiLoader } from '~/core/systems/assets';
import { PixiRenderable } from '../../_base';

/**
 * Configuration for creating a CharacterSprite
 */
export interface CharacterSpriteConfig<T extends string = string> {
  /** Character type identifier */
  type: T;
  /** Mapping of character types to sprite frame names */
  spriteMap: Record<T, string>;
  /** Name of the texture atlas */
  atlasName: string;
  /** Base sprite dimensions (used for scaling) */
  baseSize: { width: number; height: number };
}

/**
 * Generic character sprite container.
 * Renders a character from a sprite atlas with configurable type mapping.
 */
export class CharacterSprite<T extends string = string> extends PixiRenderable {
  readonly characterType: T;
  private sprite: Sprite;
  private baseSize: { width: number; height: number };

  /**
   * Creates a new CharacterSprite instance
   *
   * @param gpuLoader - The GPU loader for creating sprites from the atlas
   * @param config - Character configuration (type, sprite mapping, atlas, base size)
   * @param scale - Scale factor for the character (default: 1)
   */
  constructor(gpuLoader: PixiLoader, config: CharacterSpriteConfig<T>, scale: number = 1) {
    super(`character-${config.type}`);

    this.characterType = config.type;
    this.baseSize = config.baseSize;

    // Create sprite from atlas
    const spriteName = config.spriteMap[config.type];
    this.sprite = gpuLoader.createSprite(config.atlasName, spriteName);

    // Set center anchor for easy positioning
    this.sprite.anchor.set(0.5);

    // Apply scale
    this.sprite.width = this.baseSize.width * scale;
    this.sprite.height = this.baseSize.height * scale;

    this.addChild(this.sprite);
  }

  /**
   * Updates the scale of the character sprite
   */
  setScale(scale: number): void {
    this.sprite.width = this.baseSize.width * scale;
    this.sprite.height = this.baseSize.height * scale;
  }

  /**
   * Gets the current scale of the character
   */
  getScale(): number {
    return this.sprite.width / this.baseSize.width;
  }

  // destroy() inherited from PixiRenderable
}
