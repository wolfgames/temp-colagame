/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Loss Screen
 *
 * Shown on level failure. Encouraging tone, retry-first design.
 * DOM-based screen or Pixi overlay (both patterns provided).
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: messaging
const LOSS_TITLE = 'Out of Moves';
const ENCOURAGEMENT_LINES = [
  'So close! Try again!',
  'Almost had it!',
  'You can do this!',
  'One more try!',
];

// ADAPT: button labels
const RETRY_LABEL = 'Retry';
const BOOSTER_LABEL = 'Use Booster (+5 moves)';
const MENU_LABEL = 'Main Menu';

// ADAPT: colors
const COLORS = {
  overlay: 'rgba(0, 0, 0, 0.75)',
  titleColor: '#e63946',
  subtitleColor: 'rgba(255, 255, 255, 0.8)',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  retryBtn: '#e63946',
  boosterBtn: '#f4a236',
  menuBtn: '#555555',
  progressBg: 'rgba(255, 255, 255, 0.15)',
  progressFill: '#e63946',
  livesActive: '#e63946',
  livesEmpty: 'rgba(255, 255, 255, 0.2)',
};

// ADAPT: feature flags
const SHOW_BOOSTER_BUTTON = false;  // enable when booster system exists
const SHOW_PROGRESS_BAR = true;     // show how close they were to the goal
const SHOW_LIVES = true;            // show remaining lives

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  OVERLAY_FADE_MS: 400,
  TITLE_DELAY_MS: 150,
  TITLE_DURATION_MS: 400,         // power2.out
  SUBTITLE_DELAY_MS: 350,
  SUBTITLE_DURATION_MS: 300,      // power2.out
  SCORE_DELAY_MS: 500,
  SCORE_DURATION_MS: 300,         // power2.out
  PROGRESS_DELAY_MS: 600,
  PROGRESS_FILL_MS: 600,          // power2.out
  BUTTON_FIRST_DELAY_MS: 800,
  BUTTON_STAGGER_MS: 80,
  BUTTON_DURATION_MS: 300,        // back.out(1.3)
  LIVES_DELAY_MS: 1100,
  LIVES_DURATION_MS: 200,         // power2.out
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface LossScreenData {
  score: number;
  goalLabel: string;
  goalProgress: number;
  goalTarget: number;
  lives: number;           // remaining lives (0 = out of lives)
  maxLives: number;        // ADAPT: total lives capacity
}

interface LossScreenDeps {
  data: LossScreenData;
  onRetry: () => void;
  onBooster?: () => void;  // ADAPT: optional booster action
  onMenu: () => void;
}

interface LossScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════ */

function createLossScreen(deps: LossScreenDeps): LossScreenController {
  let wrapper: HTMLDivElement | null = null;
  const { data } = deps;

  // Pick a random encouragement line
  const encouragement = ENCOURAGEMENT_LINES[
    Math.floor(Math.random() * ENCOURAGEMENT_LINES.length)
  ];

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
      title.textContent = LOSS_TITLE;
      title.style.cssText = `
        font-size: 32px; font-weight: 800; margin: 0;
        color: ${COLORS.titleColor};
        opacity: 0; transform: translateY(-15px);
      `;

      // ── Subtitle (encouragement) ──
      const subtitle = document.createElement('p');
      subtitle.textContent = encouragement;
      subtitle.style.cssText = `
        font-size: 18px; font-weight: 500; margin: 8px 0 0;
        color: ${COLORS.subtitleColor};
        opacity: 0;
      `;

      // ── Score summary ──
      const scoreSection = document.createElement('div');
      scoreSection.style.cssText = `
        margin-top: 28px; text-align: center; opacity: 0;
      `;

      const scoreLine = document.createElement('div');
      scoreLine.textContent = `Score: ${data.score.toLocaleString()}`;
      scoreLine.style.cssText = 'font-size: 22px; font-weight: 700;';
      scoreSection.appendChild(scoreLine);

      if (data.goalTarget > 0) {
        const goalLine = document.createElement('div');
        goalLine.textContent = `${data.goalLabel}: ${data.goalProgress.toLocaleString()} / ${data.goalTarget.toLocaleString()}`;
        goalLine.style.cssText = `font-size: 14px; color: ${COLORS.textMuted}; margin-top: 4px;`;
        scoreSection.appendChild(goalLine);
      }

      // ── Progress bar (how close they were) ──
      let progressBar: HTMLDivElement | null = null;
      let progressFill: HTMLDivElement | null = null;
      if (SHOW_PROGRESS_BAR && data.goalTarget > 0) {
        progressBar = document.createElement('div');
        progressBar.style.cssText = `
          margin-top: 12px; width: 200px; height: 8px;
          background: ${COLORS.progressBg}; border-radius: 4px;
          overflow: hidden; opacity: 0;
        `;

        progressFill = document.createElement('div');
        progressFill.style.cssText = `
          width: 0%; height: 100%;
          background: ${COLORS.progressFill}; border-radius: 4px;
        `;
        progressBar.appendChild(progressFill);
        scoreSection.appendChild(progressBar);

        const pctLabel = document.createElement('div');
        const pct = Math.min(100, Math.round((data.goalProgress / data.goalTarget) * 100));
        pctLabel.textContent = `${pct}% there`;
        pctLabel.style.cssText = `font-size: 13px; color: ${COLORS.textMuted}; margin-top: 4px;`;
        scoreSection.appendChild(pctLabel);
      }

      // ── Buttons ──
      const btnColumn = document.createElement('div');
      btnColumn.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 36px; align-items: center;';

      const buttons: HTMLButtonElement[] = [];

      // Retry (always primary)
      const retryBtn = createLossButton(RETRY_LABEL, COLORS.retryBtn, true, () => deps.onRetry());
      buttons.push(retryBtn);
      btnColumn.appendChild(retryBtn);

      // Booster (optional)
      if (SHOW_BOOSTER_BUTTON && deps.onBooster) {
        const boosterBtn = createLossButton(BOOSTER_LABEL, COLORS.boosterBtn, false, () => deps.onBooster!());
        buttons.push(boosterBtn);
        btnColumn.appendChild(boosterBtn);
      }

      // Main menu
      const menuBtn = createLossButton(MENU_LABEL, COLORS.menuBtn, false, () => deps.onMenu());
      buttons.push(menuBtn);
      btnColumn.appendChild(menuBtn);

      // ── Lives display ──
      let livesRow: HTMLDivElement | null = null;
      if (SHOW_LIVES) {
        livesRow = document.createElement('div');
        livesRow.style.cssText = `
          display: flex; gap: 6px; margin-top: 20px; opacity: 0;
        `;
        for (let i = 0; i < data.maxLives; i++) {
          const heart = document.createElement('span');
          heart.textContent = i < data.lives ? '♥' : '♡';
          heart.style.cssText = `
            font-size: 20px;
            color: ${i < data.lives ? COLORS.livesActive : COLORS.livesEmpty};
          `;
          livesRow.appendChild(heart);
        }
      }

      // ── Assemble ──
      wrapper.append(title, subtitle, scoreSection, btnColumn);
      if (livesRow) wrapper.appendChild(livesRow);
      container.appendChild(wrapper);

      // ── Entrance animations (LOCKED timing) ──
      gsap.to(wrapper, {
        opacity: 1,
        duration: ANIM.OVERLAY_FADE_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(title, {
        opacity: 1, y: 0,
        duration: ANIM.TITLE_DURATION_MS / 1000,
        delay: ANIM.TITLE_DELAY_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(subtitle, {
        opacity: 1,
        duration: ANIM.SUBTITLE_DURATION_MS / 1000,
        delay: ANIM.SUBTITLE_DELAY_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(scoreSection, {
        opacity: 1,
        duration: ANIM.SCORE_DURATION_MS / 1000,
        delay: ANIM.SCORE_DELAY_MS / 1000,
        ease: 'power2.out',
      });

      if (progressBar && progressFill) {
        gsap.to(progressBar, {
          opacity: 1,
          duration: 0.2,
          delay: ANIM.PROGRESS_DELAY_MS / 1000,
          ease: 'power2.out',
        });
        const pct = Math.min(100, Math.round((data.goalProgress / data.goalTarget) * 100));
        gsap.to(progressFill, {
          width: `${pct}%`,
          duration: ANIM.PROGRESS_FILL_MS / 1000,
          delay: (ANIM.PROGRESS_DELAY_MS + 100) / 1000,
          ease: 'power2.out',
        });
      }

      buttons.forEach((btn, i) => {
        gsap.to(btn, {
          opacity: 1, scale: 1,
          duration: ANIM.BUTTON_DURATION_MS / 1000,
          delay: (ANIM.BUTTON_FIRST_DELAY_MS + i * ANIM.BUTTON_STAGGER_MS) / 1000,
          ease: 'back.out(1.3)',
        });
      });

      if (livesRow) {
        gsap.to(livesRow, {
          opacity: 1,
          duration: ANIM.LIVES_DURATION_MS / 1000,
          delay: ANIM.LIVES_DELAY_MS / 1000,
          ease: 'power2.out',
        });
      }
    },

    destroy() {
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: BUTTON FACTORY (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function createLossButton(
  label: string,
  bgColor: string,
  isPrimary: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    min-width: ${isPrimary ? '220px' : '180px'};
    min-height: 48px;
    padding: ${isPrimary ? '16px 32px' : '12px 24px'};
    border: none; border-radius: 12px;
    background: ${bgColor}; color: #ffffff;
    font-size: ${isPrimary ? '18px' : '15px'};
    font-weight: 700;
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
