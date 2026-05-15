import { Graphics, Text } from 'pixi.js';
import { PixiRenderable } from '../../_base';

export interface ProgressBarConfig {
  width: number;
  height: number;
  fontFamily?: string;
  /** Fill bar color (default: 0x007eff bright blue) */
  fillColor?: number;
  /** Completed milestone dot color (default: 0x6ffdf1 cyan) */
  milestoneColor?: number;
  showLabel?: boolean;
}

const DEFAULT_CONFIG: ProgressBarConfig = {
  width: 280,
  height: 36,
  fillColor: 0x007eff,
  milestoneColor: 0x6ffdf1,
  showLabel: true,
};

const COLORS = {
  background: 0x9a9a9a,
  milestoneDim: 0xaaaaaa,
  border: 0x000000,
};

/**
 * Chapter progress bar HUD - clean, simple design matching mock
 */
export class ProgressBar extends PixiRenderable {
  private config: ProgressBarConfig;

  // Visual components
  private backgroundGraphics: Graphics;
  private fillGraphics: Graphics;
  private milestoneGraphics: Graphics;
  private borderGraphics: Graphics;
  private labelText: Text;

  // Animation state
  private currentProgress = 0;
  private totalLevels = 10;
  private targetFillWidth = 0;
  private currentFillWidth = 0;
  private startFillWidth = 0; // Track where animation starts from
  private isAnimating = false;
  private animationTime = 0;
  private animationDuration = 0.5;

  constructor(config: Partial<ProgressBarConfig> = {}) {
    super('progress-bar');

    this.config = { ...DEFAULT_CONFIG, ...config };

    // Layers (back to front)
    this.backgroundGraphics = new Graphics();
    this.addChild(this.backgroundGraphics);

    this.fillGraphics = new Graphics();
    this.addChild(this.fillGraphics);

    this.milestoneGraphics = new Graphics();
    this.addChild(this.milestoneGraphics);

    this.borderGraphics = new Graphics();
    this.addChild(this.borderGraphics);

    this.labelText = new Text({
      text: '0 / 10',
      style: {
        fontFamily: this.config.fontFamily ?? 'sans-serif',
        fontSize: 20,
        fontWeight: 'bold',
        fill: '#ffffff',
        stroke: { color: '#000000', width: 5 },
        dropShadow: {
          color: '#000000',
          alpha: 0.5,
          blur: 3,
          distance: 3,
        },
      },
    });
    this.labelText.anchor.set(0.5);
    this.labelText.visible = this.config.showLabel !== false;
    this.addChild(this.labelText);

    this.updateVisuals();
  }

  setProgress(current: number, total: number = 10, animate: boolean = true): void {
    this.currentProgress = Math.max(0, Math.min(current, total));
    this.totalLevels = Math.max(1, total);

    const borderWidth = 4;
    const fillRatio = this.currentProgress / this.totalLevels;
    this.targetFillWidth = (this.config.width - borderWidth) * fillRatio;

    if (animate) {
      // Store current position as starting point for animation
      this.startFillWidth = this.currentFillWidth;
      this.isAnimating = true;
      this.animationTime = 0;
    } else {
      // Instant update without animation
      this.currentFillWidth = this.targetFillWidth;
      this.startFillWidth = this.targetFillWidth;
      this.isAnimating = false;
      this.updateVisuals(); // Update visuals immediately when not animating
    }

    this.labelText.text = `${this.currentProgress} / ${this.totalLevels}`;
    this.updateMilestones();
  }

  setTheme(fillColor?: number): void {
    if (fillColor !== undefined) {
      this.config.fillColor = fillColor;
    }
    this.updateVisuals();
    this.updateMilestones();
  }

  override update(dt: number): void {
    if (this.isAnimating) {
      this.animationTime += dt;
      const progress = Math.min(1, this.animationTime / this.animationDuration);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      // Animate from start position to target (not from 0)
      this.currentFillWidth = this.startFillWidth + (this.targetFillWidth - this.startFillWidth) * eased;

      if (progress >= 1) {
        this.currentFillWidth = this.targetFillWidth;
        this.isAnimating = false;
      }

      this.updateVisuals();
    }
  }

  playFillAnimation(): void {
    this.currentFillWidth = 0;
    this.animationTime = 0;
    this.isAnimating = true;
  }

  private updateVisuals(): void {
    const { width, height } = this.config;
    const radius = 10; // Rounded edges for outer bar
    const borderWidth = 4;

    // Background - lighter grey
    this.backgroundGraphics.clear();
    this.backgroundGraphics.roundRect(0, 0, width, height, radius);
    this.backgroundGraphics.fill(COLORS.background);

    // Fill bar - bright blue, no padding, no rounded corners
    this.fillGraphics.clear();
    if (this.currentFillWidth > 0) {
      // Fill starts at border edge, no gap
      const fillX = borderWidth / 2;
      const fillY = borderWidth / 2;
      const fillHeight = height - borderWidth;
      const fillWidth = Math.max(1, this.currentFillWidth);
      this.fillGraphics.rect(fillX, fillY, fillWidth, fillHeight);
      this.fillGraphics.fill(this.config.fillColor!);
    }

    // Border - thick black stroke
    this.borderGraphics.clear();
    this.borderGraphics.roundRect(0, 0, width, height, radius);
    this.borderGraphics.stroke({ color: COLORS.border, width: borderWidth });

    // Label position
    this.labelText.x = width / 2;
    this.labelText.y = height / 2;
  }

  private updateMilestones(): void {
    this.milestoneGraphics.clear();

    const { width, height } = this.config;
    const borderWidth = 4;
    const innerWidth = width - borderWidth;
    const yPos = height / 2;
    const dotRadius = 5;

    // Draw milestone dots - evenly spaced across the bar
    // Show dots for levels 0 through totalLevels (11 dots for 10 levels)
    for (let i = 0; i <= this.totalLevels; i++) {
      // Position dots evenly across the inner width
      const xPos = borderWidth / 2 + (innerWidth * i) / this.totalLevels;
      const isCompleted = i <= this.currentProgress;

      // Draw dot
      this.milestoneGraphics.circle(xPos, yPos, dotRadius);
      this.milestoneGraphics.fill(isCompleted ? this.config.milestoneColor! : COLORS.milestoneDim);
    }
  }

  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    const borderWidth = 4;
    const fillRatio = this.currentProgress / this.totalLevels;
    this.targetFillWidth = (width - borderWidth) * fillRatio;
    this.currentFillWidth = this.targetFillWidth;

    this.updateVisuals();
    this.updateMilestones();
  }
}
