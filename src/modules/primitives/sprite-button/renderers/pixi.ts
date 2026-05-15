import { Sprite, NineSliceSprite, Text, type TextStyle } from 'pixi.js';
import gsap from 'gsap';
import type { PixiLoader } from '~/core/systems/assets';
import { PixiRenderable } from '../../_base';

/**
 * Configuration for creating a SpriteButton
 */
export interface SpriteButtonConfig {
  /** Name of the texture atlas */
  atlasName: string;
  /** Name of the sprite frame within the atlas */
  spriteName: string;
  /** Optional text label to display on the button */
  label?: string;
  /** Custom width for the button sprite */
  width?: number;
  /** Custom height for the button sprite */
  height?: number;
  /** Callback function when the button is clicked */
  onClick: () => void;
  /** Use 9-slice scaling (default: false) */
  use9Slice?: boolean;
  /** 9-slice border widths (left, top, right, bottom) */
  nineSliceBorders?: {
    leftWidth: number;
    topHeight: number;
    rightWidth: number;
    bottomHeight: number;
  };
  /** Custom text style for the label */
  labelStyle?: Partial<TextStyle>;
}

/**
 * Interactive button component using Pixi sprites
 *
 * Features:
 * - Hover state with scale animation (1.05x)
 * - Press state with scale animation (0.95x)
 * - Optional text label overlay
 * - Enable/disable functionality
 * - GSAP animations for smooth transitions
 * - Supports 9-slice scaling for responsive buttons
 */
export class SpriteButton extends PixiRenderable {
  private sprite: Sprite | NineSliceSprite;
  private labelText?: Text;
  private isPressed = false;
  private config: SpriteButtonConfig;

  /**
   * Creates a new SpriteButton instance
   *
   * @param gpuLoader - The GPU loader for creating sprites from the atlas
   * @param config - Button configuration
   */
  constructor(gpuLoader: PixiLoader, config: SpriteButtonConfig) {
    super('sprite-button');

    this.config = config;

    // Create button sprite from atlas (9-slice or regular)
    if (config.use9Slice && config.nineSliceBorders) {
      // Create 9-slice sprite
      const texture = gpuLoader.getTexture(config.atlasName, config.spriteName);
      this.sprite = new NineSliceSprite({
        texture,
        leftWidth: config.nineSliceBorders.leftWidth,
        topHeight: config.nineSliceBorders.topHeight,
        rightWidth: config.nineSliceBorders.rightWidth,
        bottomHeight: config.nineSliceBorders.bottomHeight,
      });
      this.sprite.anchor.set(0.5);
    } else {
      // Create regular sprite
      this.sprite = gpuLoader.createSprite(config.atlasName, config.spriteName);
      this.sprite.anchor.set(0.5);
    }

    // Apply custom size if provided
    if (config.width) this.sprite.width = config.width;
    if (config.height) this.sprite.height = config.height;

    this.addChild(this.sprite);

    // Add text label if provided
    if (config.label) {
      const defaultStyle: Partial<TextStyle> = {
        fontSize: 18,
        fontWeight: 'bold',
        fill: 0x000000,
        align: 'center',
      };

      this.labelText = new Text({
        text: config.label,
        style: { ...defaultStyle, ...config.labelStyle },
      });
      this.labelText.anchor.set(0.5);
      this.addChild(this.labelText);
    }

    // Make interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';

    // Bind event handlers
    this.on('pointerdown', this.handlePointerDown.bind(this));
    this.on('pointerup', this.handlePointerUp.bind(this));
    this.on('pointerupoutside', this.handlePointerUpOutside.bind(this));
    this.on('pointerover', this.handlePointerOver.bind(this));
    this.on('pointerout', this.handlePointerOut.bind(this));
    this.on('pointertap', config.onClick);
  }

  /**
   * Handle pointer down event (button pressed)
   */
  private handlePointerDown(): void {
    this.isPressed = true;
    gsap.to(this.scale, {
      x: 0.95,
      y: 0.95,
      duration: 0.1,
      ease: 'power2.out',
    });
  }

  /**
   * Handle pointer up event (button released)
   */
  private handlePointerUp(): void {
    if (this.isPressed) {
      this.isPressed = false;
      gsap.to(this.scale, {
        x: 1,
        y: 1,
        duration: 0.1,
        ease: 'power2.out',
      });
    }
  }

  /**
   * Handle pointer up outside event (button released outside bounds)
   */
  private handlePointerUpOutside(): void {
    this.isPressed = false;
    gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.1,
      ease: 'power2.out',
    });
  }

  /**
   * Handle pointer over event (hover)
   */
  private handlePointerOver(): void {
    if (!this.isPressed) {
      gsap.to(this.scale, {
        x: 1.05,
        y: 1.05,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }

  /**
   * Handle pointer out event (hover end)
   */
  private handlePointerOut(): void {
    if (!this.isPressed) {
      gsap.to(this.scale, {
        x: 1,
        y: 1,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  }

  /**
   * Play exit animation - subtle scale down with fade
   * @returns Promise that resolves when animation completes
   */
  playExitAnimation(): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this, {
        alpha: 0,
        duration: 0.25,
        ease: 'power2.out',
      });
      gsap.to(this.scale, {
        x: 0.9,
        y: 0.9,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: resolve,
      });
    });
  }

  /**
   * Enable or disable the button
   *
   * When disabled, the button becomes non-interactive and semi-transparent
   *
   * @param enabled - Whether the button should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.eventMode = enabled ? 'static' : 'none';
    this.alpha = enabled ? 1 : 0.5;
    this.cursor = enabled ? 'pointer' : 'default';
  }

  /**
   * Update the button label text
   *
   * @param text - New text to display
   */
  setLabel(text: string): void {
    if (this.labelText) {
      this.labelText.text = text;
    }
  }

  // destroy() inherited from PixiRenderable — handles GSAP cleanup, listener removal, child destruction
}
