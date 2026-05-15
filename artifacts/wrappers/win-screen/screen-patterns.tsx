/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Win Screen
 *
 * Celebratory end screen for win/loss states.
 * Two patterns provided: DOM-based screen and Pixi overlay.
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: title text for win/loss states
const WIN_TITLE = 'Level Complete!';
const LOSS_TITLE = 'Out of Moves';

// ADAPT: button labels
const NEXT_LEVEL_LABEL = 'Next Level';
const RETRY_LABEL = 'Retry';
const MENU_LABEL = 'Main Menu';

// ADAPT: color palette
const COLORS = {
  overlay: 'rgba(0, 0, 0, 0.7)',
  winAccent: '#4a8c1c',
  lossAccent: '#e63946',
  menuBtn: '#555555',
  starFilled: '#ffd700',
  starEmpty: '#444444',
  text: '#ffffff',
  scoreSub: 'rgba(255, 255, 255, 0.7)',
};

// ADAPT: star count
const MAX_STARS = 3;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  OVERLAY_FADE_MS: 400,
  TITLE_DELAY_MS: 150,
  TITLE_DURATION_MS: 400,        // back.out(1.5)
  STAR_FIRST_DELAY_MS: 400,
  STAR_STAGGER_MS: 200,
  STAR_DURATION_MS: 300,         // back.out(2)
  SCORE_DELAY_MS: 500,
  SCORE_COUNTUP_MS: 800,         // power2.out
  BUTTON_DELAY_MS: 1000,
  BUTTON_DURATION_MS: 300,       // back.out(1.3)
  BUTTON_STAGGER_MS: 50,
  CONFETTI_DELAY_MS: 300,
  CONFETTI_LIFETIME_MS: 1200,
  CONFETTI_COUNT: 50,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface WinScreenData {
  won: boolean;
  score: number;
  starsEarned: number;       // 0–MAX_STARS
  highScore?: number;        // ADAPT: optional
  level: number;
}

interface WinScreenDeps {
  data: WinScreenData;
  onNextLevel: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

interface WinScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: DOM SCREEN PATTERN
 *
 * Use this when the win screen is a full DOM page (game board not visible).
 * ═══════════════════════════════════════════════════════════════════════ */

function createWinScreen(deps: WinScreenDeps): WinScreenController {
  let wrapper: HTMLDivElement | null = null;
  const { data } = deps;

  return {
    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: ${COLORS.overlay};
        font-family: system-ui, -apple-system, sans-serif;
        color: ${COLORS.text};
        touch-action: none; user-select: none; -webkit-user-select: none;
        opacity: 0;
      `;

      // ── Title ──
      const title = document.createElement('h1');
      title.textContent = data.won ? WIN_TITLE : LOSS_TITLE;
      title.style.cssText = `
        font-size: 36px; font-weight: 800; margin: 0;
        opacity: 0; transform: scale(0.5);
      `;

      // ── Stars ──
      const starsRow = document.createElement('div');
      starsRow.style.cssText = 'display: flex; gap: 12px; margin-top: 24px;';
      const starEls: HTMLElement[] = [];

      for (let i = 0; i < MAX_STARS; i++) {
        const star = document.createElement('span');
        const filled = i < data.starsEarned;
        star.textContent = filled ? '★' : '☆';
        star.style.cssText = `
          font-size: 48px;
          color: ${filled ? COLORS.starFilled : COLORS.starEmpty};
          opacity: 0; transform: scale(0);
        `;
        starsRow.appendChild(star);
        starEls.push(star);
      }

      // ── Score ──
      const scoreEl = document.createElement('div');
      scoreEl.style.cssText = `
        margin-top: 24px; text-align: center; opacity: 0;
      `;
      const scoreLabel = document.createElement('div');
      scoreLabel.style.cssText = 'font-size: 28px; font-weight: 700;';
      scoreLabel.textContent = `Score: ${data.score.toLocaleString()}`;
      scoreEl.appendChild(scoreLabel);

      if (data.highScore !== undefined) {
        const highScoreLabel = document.createElement('div');
        highScoreLabel.textContent = `High Score: ${data.highScore.toLocaleString()}`;
        highScoreLabel.style.cssText = `font-size: 16px; color: ${COLORS.scoreSub}; margin-top: 4px;`;
        scoreEl.appendChild(highScoreLabel);
      }

      // ── Buttons ──
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 16px; margin-top: 48px;';

      const primaryBtn = createResultButton(
        data.won ? NEXT_LEVEL_LABEL : RETRY_LABEL,
        data.won ? COLORS.winAccent : COLORS.lossAccent,
        data.won ? deps.onNextLevel : deps.onRetry,
      );
      const menuBtn = createResultButton(MENU_LABEL, COLORS.menuBtn, deps.onMenu);
      btnRow.append(primaryBtn, menuBtn);

      wrapper.append(title, starsRow, scoreEl, btnRow);
      container.appendChild(wrapper);

      // ── Entrance animations (LOCKED timing) ──
      gsap.to(wrapper, {
        opacity: 1,
        duration: ANIM.OVERLAY_FADE_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(title, {
        opacity: 1, scale: 1,
        duration: ANIM.TITLE_DURATION_MS / 1000,
        delay: ANIM.TITLE_DELAY_MS / 1000,
        ease: 'back.out(1.5)',
      });

      starEls.forEach((star, i) => {
        gsap.to(star, {
          opacity: 1, scale: 1,
          duration: ANIM.STAR_DURATION_MS / 1000,
          delay: (ANIM.STAR_FIRST_DELAY_MS + i * ANIM.STAR_STAGGER_MS) / 1000,
          ease: 'back.out(2)',
        });
      });

      gsap.to(scoreEl, {
        opacity: 1,
        duration: 0.4,
        delay: ANIM.SCORE_DELAY_MS / 1000,
        ease: 'power2.out',
      });

      [primaryBtn, menuBtn].forEach((btn, i) => {
        gsap.to(btn, {
          opacity: 1, scale: 1,
          duration: ANIM.BUTTON_DURATION_MS / 1000,
          delay: (ANIM.BUTTON_DELAY_MS + i * ANIM.BUTTON_STAGGER_MS) / 1000,
          ease: 'back.out(1.3)',
        });
      });
    },

    destroy() {
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: PIXI OVERLAY PATTERN
 *
 * Use this when the win screen overlays the game board (board still visible).
 * This is a reference pattern — adapt to your Pixi container setup.
 *
 * GSAP equivalents for the entrance sequence:
 *
 *   gsap.to(bg, { alpha: 0.7, duration: 0.4, ease: 'power2.out' });
 *   gsap.to(title, { alpha: 1, duration: 0.4, delay: 0.15, ease: 'power2.out' });
 *   gsap.to(title.scale, { x: 1, y: 1, duration: 0.4, delay: 0.15, ease: 'back.out(1.5)' });
 *   gsap.to(starText, { alpha: 1, duration: 0.3, delay: 0.3, ease: 'power2.out' });
 *   gsap.to(scoreLabel, { alpha: 1, duration: 0.3, delay: 0.4, ease: 'power2.out' });
 *   gsap.to(primaryBtn, { alpha: 1, duration: 0.3, delay: 0.5, ease: 'power2.out' });
 *   gsap.to(primaryBtn.scale, { x: 1, y: 1, duration: 0.3, delay: 0.5, ease: 'back.out(1.3)' });
 *   gsap.to(menuBtn, { alpha: 1, duration: 0.3, delay: 0.55, ease: 'power2.out' });
 *   gsap.to(menuBtn.scale, { x: 1, y: 1, duration: 0.3, delay: 0.55, ease: 'back.out(1.3)' });
 *
 * Pixi objects created:
 *   - Graphics rect (full viewport, black, alpha 0.7, eventMode='static')
 *   - Text (title, sans-serif 36px bold white, anchor 0.5)
 *   - Text (stars, 48px gold)
 *   - Text (score, 24px white)
 *   - Container per button (Graphics bg + Text label, eventMode='static')
 *
 * Cleanup order:
 *   1. gsap.killTweensOf(each child + scale)
 *   2. overlayLayer.removeChildren()
 *   3. overlayLayer.visible = false
 *   4. overlayLayer.eventMode = 'none'
 * ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: BUTTON FACTORY (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function createResultButton(
  label: string,
  bgColor: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    min-width: 140px; min-height: 48px;
    padding: 14px 28px;
    border: none; border-radius: 12px;
    background: ${bgColor}; color: #ffffff;
    font-size: 16px; font-weight: 700;
    cursor: pointer;
    opacity: 0; transform: scale(0.8);
    -webkit-tap-highlight-color: transparent;
  `;

  btn.addEventListener('pointerover', () => {
    gsap.to(btn, { scale: 1.05, duration: 0.1, ease: 'power2.out' });
  });
  btn.addEventListener('pointerout', () => {
    gsap.to(btn, { scale: 1, duration: 0.1, ease: 'power2.out' });
  });
  btn.addEventListener('click', onClick);

  return btn;
}
