/**
 * HUD Renderer
 *
 * GPU-rendered HUD: Level, Goal, Moves, Stars.
 * All Pixi Text/Graphics — no DOM.
 */

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import gsap from 'gsap';
import { GAME_FONT_FAMILY } from '~/game/config';
import { OBSTACLE_MAX_HP, type ObstacleType } from '../state/types';
import type { SpriteTextures } from './sprite-assets';
import { getObstacleTextureKey, OBSTACLE_VISUAL_SCALE } from './sprite-assets';

const LABEL_STYLE = {
  fontFamily: GAME_FONT_FAMILY,
  fontSize: 13,
  fill: 0x6b5b8a,
  fontWeight: '700' as const,
};

const VALUE_STYLE = {
  fontFamily: GAME_FONT_FAMILY,
  fontSize: 28,
  fill: 0x3d2b5a,
  fontWeight: '800' as const,
};

const GOAL_ICON_SIZE = 44;
const GOAL_ICON_GAP = 6;
const GOAL_ICON_SHADOW_OFFSET = 1;
const GOAL_ICON_SHADOW_COLOR = 0x1a0f2e;
// Cap effective icon size to ~41 px regardless of how many blockers are shown.
// rescaleGoalBadges scales the whole container to this fraction of its natural size
// (unless it would overflow the slot, in which case it scales down further).
const GOAL_ICON_MAX_SCALE = 0.94;
const GOAL_COUNT_BADGE_R = 12;
const GOAL_COUNT_BADGE_STYLE = {
  fontFamily: GAME_FONT_FAMILY,
  fontSize: 18,
  fill: 0xffffff,
  fontWeight: '800' as const,
};

const LABEL_PILL_COLOR = 0x8b7bb5;
const LABEL_PILL_ALPHA = 0.85;
const LABEL_PILL_PAD_X = 12;
const LABEL_PILL_PAD_Y = 3;
const LABEL_PILL_RADIUS = 8;

const STAR_BAR_HEIGHT = 12;
const STAR_BAR_PAD = 24;
const STAR_BAR_FILL_COLOR = 0xffc940;
const STAR_BAR_FILL_GLOW = 0xffe680;
const STAR_BAR_MIN_FIRST_FILL = 0.08;
const STAR_SIZE = 36;
const STAR_OUTLINE_COLOR = 0x9b8cc4;
const STAR_OUTLINE_PAD = 5;
const STAR_THRESHOLDS = [0.33, 0.58, 0.97];

/** Slot centers as fractions of the banner image dimensions (1376x768). */
const SLOT_LEFT_X = 0.16;
const SLOT_CENTER_X = 0.50;
const SLOT_RIGHT_X = 0.84;
const SLOT_LABEL_Y = 0.24;
const SLOT_VALUE_Y = 0.50;

export class HudRenderer {
  readonly container = new Container();

  private bannerSprite: Sprite | null = null;
  private bannerScale = 1;
  private bannerOffsetX = 0;
  private bannerOffsetY = 0;

  private levelLabel: Text;
  private levelValue: Text;
  private goalLabel: Text;
  private goalBadges: Container;
  private goalFallback: Text;
  private movesLabel: Text;
  private movesValue: Text;
  private labelPills: Graphics[] = [];
  private starBarContainer = new Container();
  private starBarSprite: Sprite | null = null;
  private starBarFill = new Graphics();
  private starGraphics: Graphics[] = [];
  private currentStars = 0;
  private starProgress = 0;
  private starBarWidth = 0;
  private starBarHeight = 0;
  private isFirstFill = true;
  private lowMovesThreshold = 5;
  private textures: SpriteTextures | null = null;
  private goalSlotWidth = 200;

  constructor() {
    this.levelLabel = new Text({ text: 'LEVEL', style: { ...LABEL_STYLE, fill: 0xffffff } });
    this.levelValue = new Text({ text: '1', style: VALUE_STYLE });
    this.goalLabel = new Text({ text: 'GOAL', style: { ...LABEL_STYLE, fill: 0xffffff } });
    this.goalBadges = new Container();
    this.goalFallback = new Text({ text: '', style: { ...VALUE_STYLE, fontSize: 16 } });
    this.goalFallback.anchor.set(0.5, 0.5);
    this.movesLabel = new Text({ text: 'MOVES', style: { ...LABEL_STYLE, fill: 0xffffff } });
    this.movesValue = new Text({ text: '30', style: VALUE_STYLE });

    this.levelLabel.anchor.set(0.5, 0.5);
    this.levelValue.anchor.set(0.5, 0.5);
    this.goalLabel.anchor.set(0.5, 0.5);
    this.movesLabel.anchor.set(0.5, 0.5);
    this.movesValue.anchor.set(0.5, 0.5);

    for (let i = 0; i < 3; i++) {
      const pill = new Graphics();
      this.labelPills.push(pill);
      this.container.addChild(pill);
    }

    this.container.addChild(this.levelLabel);
    this.container.addChild(this.levelValue);
    this.container.addChild(this.goalLabel);
    this.container.addChild(this.goalBadges);
    this.container.addChild(this.goalFallback);
    this.container.addChild(this.movesLabel);
    this.container.addChild(this.movesValue);

    this.starBarContainer.addChild(this.starBarFill);
    for (let i = 0; i < 3; i++) {
      const star = new Graphics();
      this.starGraphics.push(star);
      this.starBarContainer.addChild(star);
    }
    this.container.addChild(this.starBarContainer);
  }

  layout(viewportWidth: number, _padding: number = 20): void {
    const bannerTex = this.textures?.hudBanner ?? this.bannerSprite?.texture;
    if (!bannerTex) {
      this.layoutFallback(viewportWidth, _padding);
      return;
    }

    if (!this.bannerSprite) {
      this.bannerSprite = new Sprite(bannerTex);
      this.container.addChildAt(this.bannerSprite, 0);
    }

    const bannerPad = 8;
    const targetW = viewportWidth - bannerPad * 2;
    this.bannerScale = targetW / bannerTex.width;
    const bannerH = bannerTex.height * this.bannerScale;
    this.bannerOffsetX = bannerPad;
    this.bannerOffsetY = 10;

    this.bannerSprite.scale.set(this.bannerScale);
    this.bannerSprite.x = this.bannerOffsetX;
    this.bannerSprite.y = this.bannerOffsetY;

    const slotX = (frac: number) => this.bannerOffsetX + bannerTex.width * this.bannerScale * frac;
    const slotY = (frac: number) => this.bannerOffsetY + bannerTex.height * this.bannerScale * frac;

    this.levelLabel.x = slotX(SLOT_LEFT_X);
    this.levelLabel.y = slotY(SLOT_LABEL_Y);
    this.levelValue.x = slotX(SLOT_LEFT_X);
    this.levelValue.y = slotY(SLOT_VALUE_Y);

    this.goalLabel.x = slotX(SLOT_CENTER_X);
    this.goalLabel.y = slotY(SLOT_LABEL_Y);
    this.goalBadges.x = slotX(SLOT_CENTER_X);
    this.goalBadges.y = slotY(SLOT_VALUE_Y);
    this.goalFallback.x = slotX(SLOT_CENTER_X);
    this.goalFallback.y = slotY(SLOT_VALUE_Y);

    this.goalSlotWidth = (SLOT_RIGHT_X - SLOT_LEFT_X) * bannerTex.width * this.bannerScale * 0.5;
    this.rescaleGoalBadges();

    this.movesLabel.x = slotX(SLOT_RIGHT_X);
    this.movesLabel.y = slotY(SLOT_LABEL_Y);
    this.movesValue.x = slotX(SLOT_RIGHT_X);
    this.movesValue.y = slotY(SLOT_VALUE_Y);

    this.drawLabelPills();

    this.starBarWidth = viewportWidth - STAR_BAR_PAD * 2;
    this.drawStarBar();
    this.starBarContainer.x = STAR_BAR_PAD;
    this.starBarContainer.y = this.bannerOffsetY + bannerH - this.starBarHeight;
  }

  private layoutFallback(viewportWidth: number, padding: number): void {
    const centerX = viewportWidth / 2;
    const y = 52;

    this.levelLabel.x = padding + 20;
    this.levelLabel.y = y;
    this.levelValue.x = padding + 20;
    this.levelValue.y = y + 20;

    this.goalLabel.x = centerX;
    this.goalLabel.y = y;
    this.goalBadges.x = centerX;
    this.goalBadges.y = y + 20;
    this.goalFallback.x = centerX;
    this.goalFallback.y = y + 20;

    this.movesLabel.x = viewportWidth - padding - 20;
    this.movesLabel.y = y;
    this.movesValue.x = viewportWidth - padding - 20;
    this.movesValue.y = y + 20;

    this.starBarWidth = viewportWidth - STAR_BAR_PAD * 2;
    this.starBarContainer.x = STAR_BAR_PAD;
    this.starBarContainer.y = y + 58;
    this.drawStarBar();
  }

  private drawLabelPills(): void {
    const labels = [this.levelLabel, this.goalLabel, this.movesLabel];
    for (let i = 0; i < 3; i++) {
      const label = labels[i];
      const pill = this.labelPills[i];
      pill.clear();
      const w = label.width + LABEL_PILL_PAD_X * 2;
      const h = label.height + LABEL_PILL_PAD_Y * 2;
      pill.roundRect(-w / 2, -h / 2, w, h, LABEL_PILL_RADIUS)
        .fill({ color: LABEL_PILL_COLOR, alpha: LABEL_PILL_ALPHA });
      pill.x = label.x;
      pill.y = label.y;
    }
  }

  getBannerHeight(): number {
    if (!this.bannerSprite) return 90;
    return this.bannerOffsetY + this.bannerSprite.height + 4;
  }

  updateLevel(level: number): void {
    this.levelValue.text = String(level);
  }

  setTextures(textures: SpriteTextures): void {
    this.textures = textures;
    if (textures.hudBanner && !this.bannerSprite) {
      this.bannerSprite = new Sprite(textures.hudBanner);
      this.container.addChildAt(this.bannerSprite, 0);
    }
    if (textures.starBar && !this.starBarSprite) {
      this.starBarSprite = new Sprite(textures.starBar);
      this.starBarContainer.addChildAt(this.starBarSprite, 0);
    }
  }

  /**
   * Preferred goal display: icons of each blocker type currently on the board
   * with their remaining count. Falls back to text if no blockers present.
   *
   * Each blocker is rendered as a square icon with the count overlaid as a
   * small inset badge in the bottom-right corner. This keeps the item width
   * equal to GOAL_ICON_SIZE regardless of digit count, which lets
   * rescaleGoalBadges apply a consistent max-scale cap across 1–3 blockers.
   */
  updateGoalBlockers(
    blockers: Array<{ type: ObstacleType; count: number }>,
    fallbackText = '',
  ): void {
    this.goalBadges.removeChildren();

    if (blockers.length === 0 || !this.textures) {
      this.goalFallback.text = fallbackText;
      this.goalFallback.visible = fallbackText.length > 0;
      return;
    }

    this.goalFallback.visible = false;

    const n = blockers.length;
    const totalWidth = n * GOAL_ICON_SIZE + (n - 1) * GOAL_ICON_GAP;
    let x = -totalWidth / 2;

    for (const { type, count } of blockers) {
      const texKey = getObstacleTextureKey(type, OBSTACLE_MAX_HP[type]);
      const texture = this.textures.obstacles.get(texKey);

      if (texture) {
        const vScale = OBSTACLE_VISUAL_SCALE[type] ?? 1.0;
        const iconSize = GOAL_ICON_SIZE * vScale;
        const iconOffset = (GOAL_ICON_SIZE - iconSize) / 2;

        const shadowOffsets = [
          [0, -GOAL_ICON_SHADOW_OFFSET],
          [0,  GOAL_ICON_SHADOW_OFFSET],
          [-GOAL_ICON_SHADOW_OFFSET, 0],
          [ GOAL_ICON_SHADOW_OFFSET, 0],
        ] as const;
        for (const [dx, dy] of shadowOffsets) {
          const shadow = new Sprite(texture as Texture);
          shadow.width = iconSize;
          shadow.height = iconSize;
          shadow.anchor.set(0, 0.5);
          shadow.x = x + iconOffset + dx;
          shadow.y = dy;
          shadow.tint = GOAL_ICON_SHADOW_COLOR;
          this.goalBadges.addChild(shadow);
        }

        const icon = new Sprite(texture as Texture);
        icon.width = iconSize;
        icon.height = iconSize;
        icon.anchor.set(0, 0.5);
        icon.x = x + iconOffset;
        icon.y = 0;
        this.goalBadges.addChild(icon);
      }

      // Count badge: inset circle at bottom-right corner of the icon
      const badgeR = GOAL_COUNT_BADGE_R;
      const badgeX = x + GOAL_ICON_SIZE - badgeR;
      const badgeY = GOAL_ICON_SIZE * 0.5 - badgeR;
      const bg = new Graphics();
      bg.circle(0, 0, badgeR).fill({ color: 0x3d2b5a, alpha: 0.88 });
      bg.x = badgeX;
      bg.y = badgeY;
      this.goalBadges.addChild(bg);

      const countText = new Text({ text: String(count), style: GOAL_COUNT_BADGE_STYLE });
      countText.anchor.set(0.5, 0.5);
      countText.x = badgeX;
      countText.y = badgeY;
      this.goalBadges.addChild(countText);

      x += GOAL_ICON_SIZE + GOAL_ICON_GAP;
    }

    this.rescaleGoalBadges();
  }

  private rescaleGoalBadges(): void {
    const bounds = this.goalBadges.getLocalBounds();
    const contentWidth = bounds.width;
    if (contentWidth <= 0) return;
    // Always apply the max-scale cap so 1-blocker levels don't render oversized,
    // and only shrink further when content genuinely overflows the slot.
    const s = Math.min(GOAL_ICON_MAX_SCALE, this.goalSlotWidth / contentWidth);
    this.goalBadges.scale.set(s);
  }

  updateMoves(moves: number): void {
    this.movesValue.text = String(moves);

    if (moves <= this.lowMovesThreshold && moves > 0) {
      this.movesValue.style.fill = 0xc0392b;
      gsap.fromTo(
        this.movesValue.scale,
        { x: 1.3, y: 1.3 },
        { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' },
      );
    } else {
      this.movesValue.style.fill = 0x3d2b5a;
    }
  }

  updateStars(stars: number, progress?: number): void {
    let target = Math.min(1, Math.max(0, progress ?? (stars / 3)));
    this.currentStars = stars;
    if (this.isFirstFill && target > 0) {
      target = Math.max(target, STAR_BAR_MIN_FIRST_FILL);
      this.isFirstFill = false;
    }
    target = Math.max(target, this.starProgress);
    if (target !== this.starProgress) {
      gsap.killTweensOf(this);
      gsap.to(this, {
        starProgress: target,
        duration: 0.5 + target * 0.3,
        ease: 'power2.out',
        onUpdate: () => this.drawStarBar(),
      });
    }
  }

  resetStarBar(): void {
    gsap.killTweensOf(this);
    this.starProgress = 0;
    this.currentStars = 0;
    this.isFirstFill = true;
    this.drawStarBar();
  }

  /**
   * Announce the goal at level start: shows goal text big in viewport center,
   * then shrinks/slides into the HUD goal position.
   * Returns a promise that resolves when the animation completes.
   */
  announceGoal(label: string, target: number, viewportWidth: number, viewportHeight: number): Promise<void> {
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight * 0.4;

    const announcement = new Container();

    const announceLabelText = new Text({
      text: label,
      style: {
        ...LABEL_STYLE,
        fontSize: 20,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
        dropShadow: { alpha: 0.7, blur: 5, distance: 2, color: 0x000000 },
      },
    });
    announceLabelText.anchor.set(0.5, 0.5);
    announceLabelText.y = -20;

    const announceValueText = new Text({
      text: `0 / ${target}`,
      style: {
        ...VALUE_STYLE,
        fontSize: 48,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 4 },
        dropShadow: { alpha: 0.7, blur: 5, distance: 2, color: 0x000000 },
      },
    });
    announceValueText.anchor.set(0.5, 0.5);
    announceValueText.y = 24;

    announcement.addChild(announceLabelText, announceValueText);
    announcement.x = centerX;
    announcement.y = centerY;
    announcement.alpha = 0;
    announcement.scale.set(0.5);

    this.container.addChild(announcement);

    // Target position: the HUD goal label/value area
    const hudGoalX = this.goalLabel.x;
    const hudGoalY = this.goalLabel.y + 9; // midpoint between label and value

    return new Promise(resolve => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.killTweensOf(announcement);
          gsap.killTweensOf(announcement.scale);
          announcement.parent?.removeChild(announcement);
          announcement.destroy({ children: true });
          resolve();
        },
      });

      // Pop in at center
      tl.to(announcement, {
        alpha: 1,
        duration: 0.2,
        ease: 'power2.out',
      }, 0);
      tl.to(announcement.scale, {
        x: 1, y: 1,
        duration: 0.28,
        ease: 'back.out(1.7)',
      }, 0);

      // Hold
      tl.to(announcement, { duration: 0.3 });

      // Shrink and slide into HUD position
      tl.to(announcement, {
        x: hudGoalX,
        y: hudGoalY,
        alpha: 0,
        duration: 0.5,
        ease: 'power3.in',
      });
      tl.to(announcement.scale, {
        x: 0.3, y: 0.3,
        duration: 0.5,
        ease: 'power3.in',
      }, '<');
    });
  }

  destroy(): void {
    gsap.killTweensOf(this.movesValue.scale);
    gsap.killTweensOf(this);
    this.bannerSprite = null;
    this.container.destroy({ children: true });
  }

  private drawStarBar(): void {
    const w = this.starBarWidth;

    if (this.starBarSprite) {
      const scale = w / this.starBarSprite.texture.width;
      this.starBarSprite.scale.set(scale);
      this.starBarHeight = this.starBarSprite.texture.height * scale;
    } else {
      this.starBarHeight = STAR_BAR_HEIGHT + STAR_SIZE;
    }

    const cy = this.starBarHeight * 0.652;
    const trackInsetX = w * 0.10;
    const trackTop = this.starBarHeight * 0.496;
    const trackBottom = this.starBarHeight * 0.812;
    const trackW = w * 0.80;
    const trackH = trackBottom - trackTop;

    this.starBarFill.clear();
    const fillW = trackW * this.starProgress;
    if (fillW > 0.5) {
      const radius = Math.min(trackH / 2, fillW / 2);
      this.starBarFill
        .roundRect(trackInsetX, trackTop, fillW, trackH, radius)
        .fill({ color: STAR_BAR_FILL_COLOR })
        .stroke({ color: STAR_BAR_FILL_GLOW, width: 1, alpha: 0.4 });
    }

    for (let i = 0; i < 3; i++) {
      const g = this.starGraphics[i];
      g.clear();
      const sx = trackInsetX + trackW * STAR_THRESHOLDS[i];
      const filled = i < this.currentStars && this.starProgress >= STAR_THRESHOLDS[i];
      const starColor = filled ? 0xffd700 : 0x5a4a6a;
      const outlineColor = filled ? 0xf5a623 : 0x3d2b5a;
      const r = STAR_SIZE / 2;
      const outerR = r + STAR_OUTLINE_PAD;

      g.star(sx, cy, 5, outerR, outerR * 0.55, 0)
        .fill({ color: 0x2a1845, alpha: 0.7 })
        .stroke({ color: STAR_OUTLINE_COLOR, width: 4, join: 'round' });

      g.star(sx, cy, 5, r, r * 0.55, 0)
        .fill({ color: starColor })
        .stroke({ color: outlineColor, width: 2.5, join: 'round' });

      if (filled) {
        g.star(sx, cy, 5, r * 0.5, r * 0.28, 0)
          .fill({ color: 0xfff4c0, alpha: 0.6 });
      }
    }
  }
}
