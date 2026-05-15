import { NineSliceSprite, Text } from 'pixi.js';
import type { PixiLoader } from '~/core/systems/assets';
import { PixiRenderable } from '../../_base';

/**
 * Positioning configuration for the dialogue box
 */
export interface DialogueBoxPositioning {
  /** Bottom padding for dialogue box */
  dialogueBottomPadding: number;
  /** Max dialogue box width */
  dialogueMaxWidth: number;
  /** Dialogue box screen width percentage */
  dialogueWidthPercent: number;
}

/**
 * Configuration for creating a DialogueBox
 */
export interface DialogueBoxConfig {
  /** Name of the texture atlas */
  atlasName: string;
  /** Name of the dialogue sprite within the atlas */
  spriteName: string;
  /** Font family for text */
  fontFamily?: string;
  /** Positioning constants */
  positioning: DialogueBoxPositioning;
}

/**
 * Dialogue box sprite container
 * Uses NineSliceSprite for proper corner scaling
 * Includes Pixi Text for dialogue content
 */
export class DialogueBox extends PixiRenderable {
  private boxSprite: NineSliceSprite;
  private textField: Text;
  private targetHeight: number;
  private positioning: DialogueBoxPositioning;

  constructor(
    gpuLoader: PixiLoader,
    config: DialogueBoxConfig,
    screenWidth: number,
    screenHeight: number,
    heightScale: number = 0.5 // Default to half height for peek effect
  ) {
    super('dialogue-box');

    this.positioning = config.positioning;

    // Get texture for 9-slice sprite
    const texture = gpuLoader.getTexture(config.atlasName, config.spriteName);

    // Create 9-slice sprite (borders won't stretch)
    this.boxSprite = new NineSliceSprite({
      texture,
      leftWidth: 20,
      topHeight: 20,
      rightWidth: 20,
      bottomHeight: 20,
    });
    this.boxSprite.anchor.set(0.5, 0); // Top center anchor — box grows downward so taller text doesn't cover character

    // Calculate target dimensions
    const targetWidth = Math.min(
      screenWidth * this.positioning.dialogueWidthPercent,
      this.positioning.dialogueMaxWidth
    );
    this.targetHeight = 90 * heightScale; // Base height 90px, scaled by parameter

    // Set dimensions (9-slice handles corners automatically)
    this.boxSprite.width = targetWidth;
    this.boxSprite.height = this.targetHeight;

    this.addChild(this.boxSprite);

    // Create text field (Pixi Text, not DOM)
    this.textField = new Text({
      text: '',
      style: {
        fontFamily: config.fontFamily ?? 'sans-serif',
        fontSize: 18,
        fill: '#2c2c2c',
        wordWrap: true,
        wordWrapWidth: targetWidth - 80, // More horizontal padding (40px each side)
        align: 'left',
        lineHeight: 26,
        padding: 4,
      },
    });
    // Position text inside dialogue box with more padding
    this.textField.anchor.set(0, 0.5); // Left-center anchor
    this.textField.x = -(targetWidth / 2) + 40; // 40px left padding
    this.textField.y = this.targetHeight / 2; // Centered vertically (box grows downward from top)
    this.addChild(this.textField);

    // Position at bottom center
    this.updatePosition(screenWidth, screenHeight);

    // Initially hidden (for animation)
    this.alpha = 0;
  }

  /**
   * Set dialogue text and auto-resize box to fit
   */
  setText(text: string): void {
    this.textField.text = text;

    // Auto-resize box height to fit text content
    const textHeight = this.textField.height;
    const minHeight = 90; // Minimum height
    const padding = 40; // Vertical padding (20px top + 20px bottom)
    const newHeight = Math.max(minHeight, textHeight + padding);

    this.targetHeight = newHeight;
    this.boxSprite.height = newHeight;

    // Re-center text vertically (box grows downward from top)
    this.textField.y = newHeight / 2;
  }

  /**
   * Update dialogue box dimensions based on screen width
   */
  private updateDimensions(screenWidth: number): void {
    const targetWidth = Math.min(
      screenWidth * this.positioning.dialogueWidthPercent,
      this.positioning.dialogueMaxWidth
    );
    this.boxSprite.width = targetWidth;
    this.boxSprite.height = this.targetHeight;
  }

  /**
   * Update dialogue box position
   */
  private updatePosition(screenWidth: number, screenHeight: number): void {
    this.x = screenWidth / 2;
    this.y = screenHeight - this.positioning.dialogueBottomPadding;
  }

  /**
   * Resize dialogue box (called on window resize)
   */
  resize(screenWidth: number, screenHeight: number): void {
    this.updateDimensions(screenWidth);
    this.updatePosition(screenWidth, screenHeight);
  }

  /**
   * Get current dialogue box width
   */
  getWidth(): number {
    return this.boxSprite.width;
  }

  /**
   * Get current dialogue box height
   */
  getHeight(): number {
    return this.boxSprite.height;
  }
}
