/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: HUD (Heads-Up Display)
 *
 * GPU-rendered gameplay overlay: Level, Goal, Moves, Stars.
 * All Pixi Text/Graphics — no DOM.
 *
 * Production-tested pattern pulled from ClearPop game implementation.
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: font family
const FONT_FAMILY = 'system-ui, -apple-system, sans-serif';

// ADAPT: label text
const LABELS = {
  level: 'LEVEL',
  goal: 'GOAL',
  moves: 'MOVES',
} as const;

// ADAPT: colors
const COLORS = {
  label: 0xaaaaaa,
  value: 0xffffff,
  warning: 0xe63946,           // moves text when low
  starFilled: 0xffd700,
  starEmpty: 0x444444,
} as const;

// ADAPT: star configuration
const MAX_STARS = 3;
const STAR_SIZE = 18;
const STAR_GAP = 4;

// ADAPT: low-moves warning threshold
const LOW_MOVES_THRESHOLD = 5;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: TEXT STYLES (LOCKED sizes, ADAPTABLE font/colors above)
 * ═══════════════════════════════════════════════════════════════════════ */

const LABEL_STYLE = {
  fontFamily: FONT_FAMILY,
  fontSize: 14,
  fill: COLORS.label,
  fontWeight: '600' as const,
};

const VALUE_STYLE = {
  fontFamily: FONT_FAMILY,
  fontSize: 32,
  fill: COLORS.value,
  fontWeight: '700' as const,
};

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  MOVES_PULSE_DURATION: 0.2,    // seconds
  MOVES_PULSE_EASE: 'back.out(2)',
  MOVES_PULSE_SCALE: 1.3,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: HUD RENDERER CLASS
 * ═══════════════════════════════════════════════════════════════════════ */

export class HudRenderer {
  readonly container = new Container();

  private levelLabel: Text;
  private levelValue: Text;
  private goalLabel: Text;
  private goalValue: Text;
  private movesLabel: Text;
  private movesValue: Text;
  private starContainers: Graphics[] = [];
  private currentStars = 0;

  constructor() {
    this.levelLabel = new Text({ text: LABELS.level, style: LABEL_STYLE });
    this.levelValue = new Text({ text: '1', style: VALUE_STYLE });
    this.goalLabel = new Text({ text: LABELS.goal, style: LABEL_STYLE });
    this.goalValue = new Text({ text: '', style: { ...VALUE_STYLE, fontSize: 18 } });
    this.movesLabel = new Text({ text: LABELS.moves, style: LABEL_STYLE });
    this.movesValue = new Text({ text: '30', style: VALUE_STYLE });

    this.container.addChild(this.levelLabel);
    this.container.addChild(this.levelValue);
    this.container.addChild(this.goalLabel);
    this.container.addChild(this.goalValue);
    this.container.addChild(this.movesLabel);
    this.container.addChild(this.movesValue);

    for (let i = 0; i < MAX_STARS; i++) {
      const star = new Graphics();
      this.starContainers.push(star);
      this.container.addChild(star);
    }
  }

  /** Call after viewport resize to reposition elements. */
  layout(viewportWidth: number, padding: number = 20): void {
    const centerX = viewportWidth / 2;
    const y = 20; // ADAPT: vertical offset

    // Level — top left
    this.levelLabel.anchor.set(0, 0);
    this.levelLabel.x = padding;
    this.levelLabel.y = y;
    this.levelValue.anchor.set(0, 0);
    this.levelValue.x = padding;
    this.levelValue.y = y + 18;

    // Goal — top center
    this.goalLabel.anchor.set(0.5, 0);
    this.goalLabel.x = centerX;
    this.goalLabel.y = y;
    this.goalValue.anchor.set(0.5, 0);
    this.goalValue.x = centerX;
    this.goalValue.y = y + 18;

    // Moves — top right
    this.movesLabel.anchor.set(1, 0);
    this.movesLabel.x = viewportWidth - padding;
    this.movesLabel.y = y;
    this.movesValue.anchor.set(1, 0);
    this.movesValue.x = viewportWidth - padding;
    this.movesValue.y = y + 18;

    // Stars — below moves
    const starsStartX = viewportWidth - padding - (MAX_STARS * STAR_SIZE + (MAX_STARS - 1) * STAR_GAP);
    const starsY = y + 58;
    for (let i = 0; i < MAX_STARS; i++) {
      this.starContainers[i].x = starsStartX + i * (STAR_SIZE + STAR_GAP);
      this.starContainers[i].y = starsY;
    }

    this.drawStars(this.currentStars);
  }

  updateLevel(level: number): void {
    this.levelValue.text = String(level);
  }

  updateGoal(label: string, progress: number, target: number): void {
    this.goalLabel.text = label;
    this.goalValue.text = `${progress} / ${target}`; // ADAPT: format string
  }

  updateMoves(moves: number): void {
    this.movesValue.text = String(moves);

    // LOCKED: low-moves warning with pulse animation
    if (moves <= LOW_MOVES_THRESHOLD && moves > 0) {
      this.movesValue.style.fill = COLORS.warning;
      gsap.fromTo(
        this.movesValue.scale,
        { x: ANIM.MOVES_PULSE_SCALE, y: ANIM.MOVES_PULSE_SCALE },
        { x: 1, y: 1, duration: ANIM.MOVES_PULSE_DURATION, ease: ANIM.MOVES_PULSE_EASE },
      );
    } else {
      this.movesValue.style.fill = COLORS.value;
    }
  }

  updateStars(stars: number): void {
    if (stars !== this.currentStars) {
      this.currentStars = stars;
      this.drawStars(stars);
    }
  }

  /** LOCKED: destroy order — kill tweens before removing children. */
  destroy(): void {
    gsap.killTweensOf(this.movesValue.scale);
    this.container.destroy({ children: true });
  }

  private drawStars(filled: number): void {
    for (let i = 0; i < MAX_STARS; i++) {
      const g = this.starContainers[i];
      g.clear();
      const color = i < filled ? COLORS.starFilled : COLORS.starEmpty;
      g.star(STAR_SIZE / 2, STAR_SIZE / 2, 5, STAR_SIZE / 2, STAR_SIZE * 0.2, 0)
        .fill({ color });
    }
  }
}
