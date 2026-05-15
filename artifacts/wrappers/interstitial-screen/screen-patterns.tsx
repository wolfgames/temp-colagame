/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Interstitial Screen
 *
 * Meta narrative display between game rounds. Zone transitions,
 * story beats, milestone celebrations.
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: overlay darkness (0 = transparent, 1 = opaque)
const OVERLAY_OPACITY = 0.65;

// ADAPT: colors
const COLORS = {
  overlayBg: `rgba(0, 0, 0, ${OVERLAY_OPACITY})`,
  titleColor: '#ffffff',
  bodyColor: 'rgba(255, 255, 255, 0.9)',
  buttonBg: '#4a8c1c',
  buttonText: '#ffffff',
  dotActive: '#ffffff',
  dotInactive: 'rgba(255, 255, 255, 0.3)',
};

// ADAPT: typewriter speed (ms per character, 0 = instant)
const TYPEWRITER_MS_PER_CHAR = 30;

// ADAPT: auto-advance delay after text finishes (null = manual only)
const AUTO_ADVANCE_MS: number | null = null;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  BG_CROSSFADE_MS: 800,        // power2.inOut
  OVERLAY_FADE_MS: 600,        // power2.out, 200ms delay
  TITLE_ENTRANCE_MS: 600,      // power2.out, 400ms delay
  CONTINUE_DELAY_AFTER_TEXT_MS: 500,
  CONTINUE_ENTRANCE_MS: 300,   // back.out(1.3)
  PAGE_TRANSITION_MS: 400,     // power2.inOut
  EXIT_FADE_MS: 500,           // power2.in
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface InterstitialSlide {
  title?: string;              // ADAPT: zone or chapter title
  body: string;                // ADAPT: narrative text
  backgroundImage?: string;    // ADAPT: art asset path (null = solid color)
  characterImage?: string;     // ADAPT: character portrait (null = none)
}

// ADAPT: match your screen transition function
interface InterstitialScreenDeps {
  slides: InterstitialSlide[];
  onContinue: () => void;
}

interface InterstitialScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════ */

function createInterstitialScreen(deps: InterstitialScreenDeps): InterstitialScreenController {
  let wrapper: HTMLDivElement | null = null;
  let currentSlide = 0;
  let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  let isTyping = false;
  let fullText = '';
  let bodyEl: HTMLParagraphElement | null = null;
  let continueBtn: HTMLButtonElement | null = null;

  function showSlide(index: number): void {
    if (!wrapper) return;
    currentSlide = index;
    const slide = deps.slides[index];
    if (!slide) return;

    // Update background
    const bgEl = wrapper.querySelector('[data-role="bg"]') as HTMLDivElement | null;
    if (bgEl && slide.backgroundImage) {
      bgEl.style.backgroundImage = `url(${slide.backgroundImage})`;
      gsap.fromTo(bgEl,
        { opacity: 0 },
        { opacity: 1, duration: ANIM.BG_CROSSFADE_MS / 1000, ease: 'power2.inOut' },
      );
    }

    // Update title
    const titleEl = wrapper.querySelector('[data-role="title"]') as HTMLHeadingElement | null;
    if (titleEl) {
      titleEl.textContent = slide.title ?? '';
      titleEl.style.display = slide.title ? 'block' : 'none';
      gsap.fromTo(titleEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: ANIM.TITLE_ENTRANCE_MS / 1000, delay: 0.4, ease: 'power2.out' },
      );
    }

    // Update character
    const charEl = wrapper.querySelector('[data-role="character"]') as HTMLImageElement | null;
    if (charEl) {
      if (slide.characterImage) {
        charEl.src = slide.characterImage;
        charEl.style.display = 'block';
      } else {
        charEl.style.display = 'none';
      }
    }

    // Typewriter body text
    if (continueBtn) {
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

    // Update page dots
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
    const delay = ANIM.CONTINUE_DELAY_AFTER_TEXT_MS;
    setTimeout(() => {
      if (continueBtn) {
        gsap.fromTo(continueBtn,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: ANIM.CONTINUE_ENTRANCE_MS / 1000, ease: 'back.out(1.3)' },
        );
      }
    }, delay);

    if (AUTO_ADVANCE_MS !== null) {
      autoAdvanceTimer = setTimeout(() => advance(), delay + AUTO_ADVANCE_MS);
    }
  }

  function advance(): void {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    if (currentSlide < deps.slides.length - 1) {
      showSlide(currentSlide + 1);
    } else {
      exit();
    }
  }

  function exit(): void {
    if (!wrapper) return;
    gsap.to(wrapper, {
      opacity: 0,
      duration: ANIM.EXIT_FADE_MS / 1000,
      ease: 'power2.in',
      onComplete: () => deps.onContinue(),
    });
  }

  function updateDots(): void {
    if (!wrapper || deps.slides.length <= 1) return;
    const dotsEl = wrapper.querySelector('[data-role="dots"]');
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < deps.slides.length; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 4px;
        background: ${i === currentSlide ? COLORS.dotActive : COLORS.dotInactive};
        transition: background 200ms ease-out;
      `;
      dotsEl.appendChild(dot);
    }
  }

  return {
    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: ${COLORS.titleColor};
        touch-action: none; user-select: none; -webkit-user-select: none;
        overflow: hidden;
      `;

      // ── Background image layer ──
      const bg = document.createElement('div');
      bg.dataset.role = 'bg';
      bg.style.cssText = `
        position: absolute; inset: 0;
        background-size: cover; background-position: center;
        opacity: 0;
      `;
      gsap.to(bg, {
        opacity: 1,
        duration: ANIM.BG_CROSSFADE_MS / 1000,
        ease: 'power2.inOut',
      });

      // ── Dark overlay ──
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute; inset: 0;
        background: ${COLORS.overlayBg};
        opacity: 0;
      `;
      gsap.to(overlay, {
        opacity: 1,
        duration: ANIM.OVERLAY_FADE_MS / 1000,
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

      // Character portrait (optional)
      const charImg = document.createElement('img');
      charImg.dataset.role = 'character';
      charImg.style.cssText = 'width: 120px; height: 120px; object-fit: contain; margin-bottom: 24px; display: none;';
      content.appendChild(charImg);

      // Title
      const title = document.createElement('h1');
      title.dataset.role = 'title';
      title.style.cssText = `
        font-size: 28px; font-weight: 800; margin: 0 0 16px;
        opacity: 0; transform: translateY(20px);
      `;
      content.appendChild(title);

      // Body text
      bodyEl = document.createElement('p');
      bodyEl.style.cssText = `
        font-size: 16px; line-height: 1.6; margin: 0;
        color: ${COLORS.bodyColor};
        min-height: 80px;
      `;
      content.appendChild(bodyEl);

      // Continue button
      continueBtn = document.createElement('button');
      continueBtn.textContent = 'Continue'; // ADAPT: button label
      continueBtn.style.cssText = `
        margin-top: 32px; min-width: 160px; min-height: 48px;
        padding: 14px 28px; border: none; border-radius: 12px;
        background: ${COLORS.buttonBg}; color: ${COLORS.buttonText};
        font-size: 16px; font-weight: 700; cursor: pointer;
        opacity: 0; transform: scale(0.8);
        -webkit-tap-highlight-color: transparent;
      `;
      continueBtn.addEventListener('click', () => advance());
      content.appendChild(continueBtn);

      // Page dots
      if (deps.slides.length > 1) {
        const dots = document.createElement('div');
        dots.dataset.role = 'dots';
        dots.style.cssText = 'display: flex; gap: 8px; margin-top: 24px;';
        content.appendChild(dots);
      }

      wrapper.append(bg, overlay, content);
      container.appendChild(wrapper);

      // Tap anywhere to skip typewriter
      wrapper.addEventListener('click', () => {
        if (isTyping) skipTypewriter();
      });

      // Show first slide
      showSlide(0);
    },

    destroy() {
      if (typewriterTimer) clearTimeout(typewriterTimer);
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
      bodyEl = null;
      continueBtn = null;
    },
  };
}
