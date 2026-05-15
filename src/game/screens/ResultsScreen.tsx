import { onMount, onCleanup } from 'solid-js';
import gsap from 'gsap';
import { useScreen } from '~/core/systems/screens';
import { gameState } from '~/game/state';
import { getActiveVariant } from '~/game/clearpop/variants';
import { getZoneBridgeSlide } from '~/game/clearpop/themes/theme-helpers';

const ACTIVE_THEME = getActiveVariant().theme;
const STRINGS = ACTIVE_THEME.strings;

/**
 * ResultsScreen — Win/Loss/Interstitial Wrapper Integration
 *
 * Branches to the win or loss wrapper controller based on game state.
 * On win, detects zone boundaries and shows the interstitial overlay
 * before advancing to the next level.
 *
 * Uses wrapper patterns from artifacts/wrappers/win-screen/, loss-screen/,
 * and interstitial-screen/.
 *
 * Reads from SolidJS signals (not ECS) because the game's ECS database
 * is destroyed before this screen mounts.
 */

const ZONE_SIZE = 10; // levels per zone — must match LEVELS_PER_ZONE in content/zones.ts

export function ResultsScreen() {
  const { goto } = useScreen();
  let containerRef: HTMLDivElement | undefined;
  let controller: { destroy: () => void } | null = null;

  const won = gameState.blockerCount() === 0;
  const stars = gameState.starsEarned();
  const score = gameState.score();
  const level = gameState.level();

  const advanceToNextLevel = () => {
    gameState.incrementLevel();
    gameState.setScore(0);
    gameState.setMovesRemaining(30);
    gameState.setStarsEarned(0);
    goto('game');
  };

  const handleNextLevel = () => {
    const currentLevel = level;
    const nextLevel = currentLevel + 1;
    const oldZone = Math.floor((currentLevel - 1) / ZONE_SIZE) + 1;
    const newZone = Math.floor((nextLevel - 1) / ZONE_SIZE) + 1;

    if (newZone !== oldZone && containerRef) {
      // Zone boundary — show interstitial overlay before advancing
      controller?.destroy();
      controller = createInterstitialController(containerRef, {
        slides: getZoneSlides(newZone),
        onContinue: advanceToNextLevel,
      });
    } else {
      advanceToNextLevel();
    }
  };

  const handleRetry = () => {
    gameState.setScore(0);
    gameState.setMovesRemaining(30);
    gameState.setStarsEarned(0);
    goto('game');
  };

  const handleMainMenu = () => {
    goto('start');
  };

  onMount(() => {
    if (!containerRef) return;

    if (won) {
      controller = createWinController(containerRef, {
        score,
        starsEarned: stars,
        level,
        onNextLevel: handleNextLevel,
        onMenu: handleMainMenu,
      });
    } else {
      controller = createLossController(containerRef, {
        score,
        level,
        onRetry: handleRetry,
        onMenu: handleMainMenu,
      });
    }
  });

  onCleanup(() => {
    controller?.destroy();
    controller = null;
  });

  return <div ref={containerRef} class="fixed inset-0" />;
}

/* ═══════════════════════════════════════════════════════════════════════
 * WIN CONTROLLER (from artifacts/wrappers/win-screen/)
 *
 * LOCKED animation timings. ADAPTABLE content.
 * ═══════════════════════════════════════════════════════════════════════ */

const WIN_COLORS = {
  overlay: 'rgba(0, 0, 0, 0.7)',
  accent: '#4a8c1c',           // ADAPT: win accent color
  menuBtn: '#555555',
  starFilled: '#ffd700',
  starEmpty: '#444444',
  text: '#ffffff',
  scoreSub: 'rgba(255, 255, 255, 0.5)',
};

const MAX_STARS = 3;

interface WinOpts {
  score: number;
  starsEarned: number;
  level: number;
  onNextLevel: () => void;
  onMenu: () => void;
}

function createWinController(container: HTMLDivElement, opts: WinOpts) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: ${WIN_COLORS.overlay};
    font-family: system-ui, -apple-system, sans-serif;
    color: ${WIN_COLORS.text};
    touch-action: none; user-select: none; -webkit-user-select: none;
    opacity: 0;
  `;

  // ── Title ──
  const title = document.createElement('h1');
  title.textContent = STRINGS.win.title;
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
    const filled = i < opts.starsEarned;
    star.textContent = filled ? '\u2605' : '\u2606';
    star.style.cssText = `
      font-size: 48px;
      color: ${filled ? WIN_COLORS.starFilled : WIN_COLORS.starEmpty};
      opacity: 0; transform: scale(0);
    `;
    starsRow.appendChild(star);
    starEls.push(star);
  }

  // ── Score ──
  const scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'margin-top: 24px; text-align: center; opacity: 0;';

  const levelLine = document.createElement('div');
  levelLine.textContent = `Level ${opts.level}`;
  levelLine.style.cssText = `font-size: 14px; color: ${WIN_COLORS.scoreSub}; margin-bottom: 4px;`;

  const scoreLine = document.createElement('div');
  scoreLine.style.cssText = 'font-size: 48px; font-weight: 700;';
  scoreLine.textContent = opts.score.toLocaleString();

  scoreEl.append(levelLine, scoreLine);

  // ── Buttons ──
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 16px; margin-top: 48px;';

  const nextBtn = createResultBtn(STRINGS.win.nextLevel, WIN_COLORS.accent, opts.onNextLevel);
  const menuBtn = createResultBtn(STRINGS.win.mainMenu, WIN_COLORS.menuBtn, opts.onMenu);
  btnRow.append(nextBtn, menuBtn);

  wrapper.append(title, starsRow, scoreEl, btnRow);
  container.appendChild(wrapper);

  // ── Entrance animations (LOCKED) ──
  gsap.to(wrapper, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  gsap.to(title, {
    opacity: 1, scale: 1,
    duration: 0.4, delay: 0.15, ease: 'back.out(1.5)',
  });

  starEls.forEach((star, i) => {
    gsap.to(star, {
      opacity: 1, scale: 1,
      duration: 0.3, delay: (400 + i * 200) / 1000, ease: 'back.out(2)',
    });
  });

  gsap.to(scoreEl, { opacity: 1, duration: 0.4, delay: 0.5, ease: 'power2.out' });

  [nextBtn, menuBtn].forEach((btn, i) => {
    gsap.to(btn, {
      opacity: 1, scale: 1,
      duration: 0.3, delay: (1000 + i * 50) / 1000, ease: 'back.out(1.3)',
    });
  });

  return {
    destroy() {
      gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper.remove();
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * LOSS CONTROLLER (from artifacts/wrappers/loss-screen/)
 *
 * LOCKED animation timings. Encouraging tone, retry-first design.
 * ═══════════════════════════════════════════════════════════════════════ */

const LOSS_COLORS = {
  overlay: 'rgba(0, 0, 0, 0.75)',
  title: '#e63946',            // ADAPT: loss accent
  subtitle: 'rgba(255, 255, 255, 0.8)',
  text: '#ffffff',
  retryBtn: '#e63946',
  menuBtn: '#555555',
};

const ENCOURAGEMENT = STRINGS.loss.encouragement;

interface LossOpts {
  score: number;
  level: number;
  onRetry: () => void;
  onMenu: () => void;
}

function createLossController(container: HTMLDivElement, opts: LossOpts) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: ${LOSS_COLORS.overlay};
    font-family: system-ui, -apple-system, sans-serif;
    color: ${LOSS_COLORS.text};
    touch-action: none; user-select: none; -webkit-user-select: none;
    opacity: 0;
  `;

  // ── Title ──
  const title = document.createElement('h1');
  title.textContent = STRINGS.loss.title;
  title.style.cssText = `
    font-size: 32px; font-weight: 800; margin: 0;
    color: ${LOSS_COLORS.title};
    opacity: 0; transform: translateY(-15px);
  `;

  // ── Subtitle (encouragement) ──
  const subtitle = document.createElement('p');
  subtitle.textContent = ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)];
  subtitle.style.cssText = `
    font-size: 18px; font-weight: 500; margin: 8px 0 0;
    color: ${LOSS_COLORS.subtitle};
    opacity: 0;
  `;

  // ── Score ──
  const scoreSection = document.createElement('div');
  scoreSection.style.cssText = 'margin-top: 28px; text-align: center; opacity: 0;';

  const levelLine = document.createElement('div');
  levelLine.textContent = `Level ${opts.level}`;
  levelLine.style.cssText = 'font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 4px;';

  const scoreLine = document.createElement('div');
  scoreLine.textContent = `Score: ${opts.score.toLocaleString()}`;
  scoreLine.style.cssText = 'font-size: 22px; font-weight: 700;';

  scoreSection.append(levelLine, scoreLine);

  // ── Buttons (retry is primary, always largest) ──
  const btnColumn = document.createElement('div');
  btnColumn.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 36px; align-items: center;';

  const retryBtn = createResultBtn(STRINGS.loss.retry, LOSS_COLORS.retryBtn, opts.onRetry, true);
  const menuBtn = createResultBtn(STRINGS.loss.mainMenu, LOSS_COLORS.menuBtn, opts.onMenu);
  btnColumn.append(retryBtn, menuBtn);

  wrapper.append(title, subtitle, scoreSection, btnColumn);
  container.appendChild(wrapper);

  // ── Entrance animations (LOCKED) ──
  gsap.to(wrapper, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  gsap.to(title, {
    opacity: 1, y: 0,
    duration: 0.4, delay: 0.15, ease: 'power2.out',
  });
  gsap.to(subtitle, { opacity: 1, duration: 0.3, delay: 0.35, ease: 'power2.out' });
  gsap.to(scoreSection, { opacity: 1, duration: 0.3, delay: 0.5, ease: 'power2.out' });

  [retryBtn, menuBtn].forEach((btn, i) => {
    gsap.to(btn, {
      opacity: 1, scale: 1,
      duration: 0.3, delay: (800 + i * 80) / 1000, ease: 'back.out(1.3)',
    });
  });

  return {
    destroy() {
      gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper.remove();
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * INTERSTITIAL CONTROLLER (from artifacts/wrappers/interstitial-screen/)
 *
 * LOCKED animation timings. Shows between zones with typewriter text.
 * ═══════════════════════════════════════════════════════════════════════ */

const INTERSTITIAL_COLORS = {
  overlayBg: 'rgba(0, 0, 0, 0.65)',
  titleColor: '#ffffff',
  bodyColor: 'rgba(255, 255, 255, 0.9)',
  buttonBg: '#4a8c1c',             // ADAPT: continue button color
  buttonText: '#ffffff',
  dotActive: '#ffffff',
  dotInactive: 'rgba(255, 255, 255, 0.3)',
};

// ADAPT: typewriter speed (ms per character, 0 = instant)
const TYPEWRITER_MS_PER_CHAR = 30;

const INTERSTITIAL_ANIM = {
  BG_CROSSFADE_MS: 800,
  OVERLAY_FADE_MS: 600,
  TITLE_ENTRANCE_MS: 600,
  CONTINUE_DELAY_AFTER_TEXT_MS: 500,
  CONTINUE_ENTRANCE_MS: 300,
  EXIT_FADE_MS: 500,
} as const;

interface InterstitialSlide {
  title?: string;
  body: string;
}

interface InterstitialOpts {
  slides: InterstitialSlide[];
  onContinue: () => void;
}

function getZoneSlides(zone: number): InterstitialSlide[] {
  const slide = getZoneBridgeSlide(ACTIVE_THEME, zone);
  return [{ title: slide.title, body: slide.body }];
}

function createInterstitialController(container: HTMLDivElement, opts: InterstitialOpts) {
  let currentSlide = 0;
  let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  let isTyping = false;
  let fullText = '';
  let bodyEl: HTMLParagraphElement | null = null;
  let continueBtn: HTMLButtonElement | null = null;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    color: ${INTERSTITIAL_COLORS.titleColor};
    touch-action: none; user-select: none; -webkit-user-select: none;
    overflow: hidden;
  `;

  // ── Dark overlay ──
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0;
    background: ${INTERSTITIAL_COLORS.overlayBg};
    opacity: 0;
  `;
  gsap.to(overlay, {
    opacity: 1,
    duration: INTERSTITIAL_ANIM.OVERLAY_FADE_MS / 1000,
    delay: 0.2,
    ease: 'power2.out',
  });

  // ── Content ──
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center; text-align: center;
    padding: 32px 24px; max-width: 400px;
  `;

  // Title
  const titleEl = document.createElement('h1');
  titleEl.style.cssText = `
    font-size: 28px; font-weight: 800; margin: 0 0 16px;
    opacity: 0; transform: translateY(20px);
  `;
  content.appendChild(titleEl);

  // Body text
  bodyEl = document.createElement('p');
  bodyEl.style.cssText = `
    font-size: 16px; line-height: 1.6; margin: 0;
    color: ${INTERSTITIAL_COLORS.bodyColor};
    min-height: 80px;
  `;
  content.appendChild(bodyEl);

  // Continue button
  continueBtn = document.createElement('button');
  continueBtn.textContent = STRINGS.interstitial.continue;
  continueBtn.style.cssText = `
    margin-top: 32px; min-width: 160px; min-height: 48px;
    padding: 14px 28px; border: none; border-radius: 12px;
    background: ${INTERSTITIAL_COLORS.buttonBg}; color: ${INTERSTITIAL_COLORS.buttonText};
    font-size: 16px; font-weight: 700; cursor: pointer;
    opacity: 0; transform: scale(0.8);
    -webkit-tap-highlight-color: transparent;
  `;
  continueBtn.addEventListener('pointerover', () => {
    gsap.to(continueBtn!, { scale: 1.05, duration: 0.1, ease: 'power2.out' });
  });
  continueBtn.addEventListener('pointerout', () => {
    gsap.to(continueBtn!, { scale: 1, duration: 0.1, ease: 'power2.out' });
  });
  continueBtn.addEventListener('click', () => advance());
  content.appendChild(continueBtn);

  // Page dots (only if multi-slide)
  let dotsEl: HTMLDivElement | null = null;
  if (opts.slides.length > 1) {
    dotsEl = document.createElement('div');
    dotsEl.style.cssText = 'display: flex; gap: 8px; margin-top: 24px;';
    content.appendChild(dotsEl);
  }

  wrapper.append(overlay, content);
  container.appendChild(wrapper);

  // Tap anywhere to skip typewriter
  wrapper.addEventListener('click', () => {
    if (isTyping) skipTypewriter();
  });

  function showSlide(index: number): void {
    currentSlide = index;
    const slide = opts.slides[index];
    if (!slide) return;

    titleEl.textContent = slide.title ?? '';
    titleEl.style.display = slide.title ? 'block' : 'none';
    gsap.fromTo(titleEl,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0,
        duration: INTERSTITIAL_ANIM.TITLE_ENTRANCE_MS / 1000,
        delay: 0.4,
        ease: 'power2.out',
      },
    );

    if (continueBtn) {
      gsap.killTweensOf(continueBtn);
      continueBtn.style.opacity = '0';
      continueBtn.style.transform = 'scale(0.8)';
    }

    fullText = slide.body;
    if (TYPEWRITER_MS_PER_CHAR > 0) {
      startTypewriter();
    } else {
      if (bodyEl) bodyEl.textContent = fullText;
      isTyping = false;
      scheduleShowContinue();
    }

    updateDots();
  }

  function startTypewriter(): void {
    if (!bodyEl) return;
    isTyping = true;
    bodyEl.textContent = '';
    let charIndex = 0;

    function tick(): void {
      if (!bodyEl || !isTyping) return;
      if (charIndex < fullText.length) {
        bodyEl.textContent += fullText[charIndex];
        charIndex++;
        typewriterTimer = setTimeout(tick, TYPEWRITER_MS_PER_CHAR);
      } else {
        isTyping = false;
        scheduleShowContinue();
      }
    }
    tick();
  }

  function skipTypewriter(): void {
    if (!isTyping || !bodyEl) return;
    if (typewriterTimer) clearTimeout(typewriterTimer);
    bodyEl.textContent = fullText;
    isTyping = false;
    scheduleShowContinue();
  }

  function scheduleShowContinue(): void {
    if (!continueBtn) return;
    const btn = continueBtn;
    gsap.delayedCall(INTERSTITIAL_ANIM.CONTINUE_DELAY_AFTER_TEXT_MS / 1000, () => {
      gsap.fromTo(btn,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1, scale: 1,
          duration: INTERSTITIAL_ANIM.CONTINUE_ENTRANCE_MS / 1000,
          ease: 'back.out(1.3)',
        },
      );
    });
  }

  function advance(): void {
    if (currentSlide < opts.slides.length - 1) {
      showSlide(currentSlide + 1);
    } else {
      gsap.to(wrapper, {
        opacity: 0,
        duration: INTERSTITIAL_ANIM.EXIT_FADE_MS / 1000,
        ease: 'power2.in',
        onComplete: () => opts.onContinue(),
      });
    }
  }

  function updateDots(): void {
    if (!dotsEl || opts.slides.length <= 1) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < opts.slides.length; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 4px;
        background: ${i === currentSlide ? INTERSTITIAL_COLORS.dotActive : INTERSTITIAL_COLORS.dotInactive};
        transition: background 200ms ease-out;
      `;
      dotsEl.appendChild(dot);
    }
  }

  // Show first slide
  showSlide(0);

  return {
    destroy() {
      if (typewriterTimer) clearTimeout(typewriterTimer);
      gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper.remove();
      bodyEl = null;
      continueBtn = null;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SHARED BUTTON FACTORY (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function createResultBtn(
  label: string,
  bgColor: string,
  onClick: () => void,
  isPrimary = false,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    min-width: ${isPrimary ? '220px' : '140px'};
    min-height: 48px;
    padding: ${isPrimary ? '16px 32px' : '14px 28px'};
    border: none; border-radius: 12px;
    background: ${bgColor}; color: #ffffff;
    font-size: ${isPrimary ? '18px' : '16px'}; font-weight: 700;
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
