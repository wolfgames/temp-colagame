import gsap from 'gsap';
import { SPRITE_BUTTON_DEFAULTS } from '../defaults';

/**
 * Configuration for creating a Phaser SpriteButton
 */
export interface PhaserSpriteButtonConfig {
  /** Texture key (loaded via scene.load.image or scene.load.atlas) */
  textureKey: string;
  /** Frame name within the atlas (optional if using a single image) */
  frameName?: string;
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
  labelStyle?: Phaser.Types.GameObjects.Text.TextStyle;
}

/**
 * Interactive button component using Phaser game objects
 *
 * Features:
 * - Hover state with scale animation (1.05x)
 * - Press state with scale animation (0.95x)
 * - Optional text label overlay
 * - Enable/disable functionality
 * - GSAP animations for smooth transitions
 * - Supports 9-slice scaling for responsive buttons
 */
export class PhaserSpriteButton extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.NineSlice;
  private labelText?: Phaser.GameObjects.Text;
  private isPressed = false;
  private config: PhaserSpriteButtonConfig;
  private _enabled = true;

  /**
   * Creates a new PhaserSpriteButton instance
   *
   * @param scene - The Phaser scene this button belongs to
   * @param x - X position
   * @param y - Y position
   * @param config - Button configuration
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: PhaserSpriteButtonConfig,
  ) {
    super(scene, x, y);

    this.config = config;

    // Create button sprite (9-slice or regular)
    if (config.use9Slice && config.nineSliceBorders) {
      const { leftWidth, topHeight, rightWidth, bottomHeight } = config.nineSliceBorders;
      this.sprite = scene.add.nineslice(
        0, 0,
        config.textureKey,
        config.frameName,
        config.width ?? 200,
        config.height ?? 60,
        leftWidth, rightWidth, topHeight, bottomHeight,
      );
    } else {
      this.sprite = scene.add.sprite(0, 0, config.textureKey, config.frameName);
      if (config.width) this.sprite.displayWidth = config.width;
      if (config.height) this.sprite.displayHeight = config.height;
    }

    this.add(this.sprite);

    // Add text label if provided
    if (config.label) {
      const defaultStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: `${SPRITE_BUTTON_DEFAULTS.labelFontSize}px`,
        fontStyle: SPRITE_BUTTON_DEFAULTS.labelFontWeight,
        color: '#000000',
        align: 'center',
      };

      this.labelText = scene.add.text(0, 0, config.label, {
        ...defaultStyle,
        ...config.labelStyle,
      });
      this.labelText.setOrigin(0.5);
      this.add(this.labelText);
    }

    // Make interactive — hit area matches the sprite bounds
    const hitWidth = this.sprite.displayWidth;
    const hitHeight = this.sprite.displayHeight;
    this.setSize(hitWidth, hitHeight);
    this.setInteractive({ useHandCursor: true });

    // Bind pointer events
    this.on('pointerdown', this.handlePointerDown, this);
    this.on('pointerup', this.handlePointerUp, this);
    this.on('pointerout', this.handlePointerOut, this);
    this.on('pointerover', this.handlePointerOver, this);

    // Add to scene
    scene.add.existing(this);
  }

  private handlePointerDown(): void {
    if (!this._enabled) return;
    this.isPressed = true;
    gsap.to(this, {
      scaleX: SPRITE_BUTTON_DEFAULTS.pressScale,
      scaleY: SPRITE_BUTTON_DEFAULTS.pressScale,
      duration: SPRITE_BUTTON_DEFAULTS.pressDuration,
      ease: SPRITE_BUTTON_DEFAULTS.ease,
    });
  }

  private handlePointerUp(): void {
    if (!this._enabled) return;
    if (this.isPressed) {
      this.isPressed = false;
      gsap.to(this, {
        scaleX: 1,
        scaleY: 1,
        duration: SPRITE_BUTTON_DEFAULTS.pressDuration,
        ease: SPRITE_BUTTON_DEFAULTS.ease,
      });
      this.config.onClick();
    }
  }

  private handlePointerOver(): void {
    if (!this._enabled || this.isPressed) return;
    gsap.to(this, {
      scaleX: SPRITE_BUTTON_DEFAULTS.hoverScale,
      scaleY: SPRITE_BUTTON_DEFAULTS.hoverScale,
      duration: SPRITE_BUTTON_DEFAULTS.hoverDuration,
      ease: SPRITE_BUTTON_DEFAULTS.ease,
    });
  }

  private handlePointerOut(): void {
    if (!this._enabled) return;
    this.isPressed = false;
    gsap.to(this, {
      scaleX: 1,
      scaleY: 1,
      duration: SPRITE_BUTTON_DEFAULTS.hoverDuration,
      ease: SPRITE_BUTTON_DEFAULTS.ease,
    });
  }

  /**
   * Play exit animation — subtle scale down with fade
   */
  playExitAnimation(): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this, {
        alpha: 0,
        scaleX: SPRITE_BUTTON_DEFAULTS.exitScale,
        scaleY: SPRITE_BUTTON_DEFAULTS.exitScale,
        duration: SPRITE_BUTTON_DEFAULTS.exitDuration,
        ease: SPRITE_BUTTON_DEFAULTS.ease,
        onComplete: resolve,
      });
    });
  }

  /**
   * Enable or disable the button
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (enabled) {
      this.setInteractive({ useHandCursor: true });
      this.alpha = 1;
    } else {
      this.disableInteractive();
      this.alpha = SPRITE_BUTTON_DEFAULTS.disabledAlpha;
    }
  }

  /**
   * Update the button label text
   */
  setLabel(text: string): void {
    if (this.labelText) {
      this.labelText.setText(text);
    }
  }

  override destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    gsap.killTweensOf(this);
    super.destroy(fromScene);
  }
}
