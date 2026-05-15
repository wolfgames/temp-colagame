/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Title Screen
 *
 * Initial screen before gameplay. Logo, title, play button.
 * DOM-based (SolidJS or imperative DOM). Not GPU code.
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: game title and tagline
const GAME_TITLE = 'My Game';
const GAME_TAGLINE = 'A fun puzzle adventure';

// ADAPT: background color or CSS gradient
const BACKGROUND = 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

// ADAPT: button colors
const BUTTON_PRIMARY_BG = '#4a8c1c';
const BUTTON_PRIMARY_TEXT = '#ffffff';
const BUTTON_SECONDARY_BG = 'rgba(255,255,255,0.15)';
const BUTTON_SECONDARY_TEXT = '#ffffff';

// ADAPT: logo asset path (null = text-only title)
const LOGO_PATH: string | null = null;

// ADAPT: version string (null = hide)
const VERSION_STRING: string | null = 'v1.0.0';

// ADAPT: whether to show settings button
const SHOW_SETTINGS_BUTTON = true;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  LOGO_DELAY_MS: 200,
  LOGO_DURATION_MS: 600,        // back.out(1.7)
  TITLE_DELAY_MS: 500,
  TITLE_DURATION_MS: 400,       // power2.out
  TAGLINE_DELAY_MS: 700,
  TAGLINE_DURATION_MS: 300,     // power2.out
  BUTTON_STAGGER_MS: 100,
  BUTTON_FIRST_DELAY_MS: 900,
  BUTTON_DURATION_MS: 300,      // back.out(1.3)
  VERSION_DELAY_MS: 1100,
  VERSION_DURATION_MS: 200,     // power2.out
  HOVER_SCALE: 1.05,
  HOVER_DURATION_MS: 100,
  PRESS_SCALE: 0.95,
  PRESS_DURATION_MS: 200,       // back.out(1.5)
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: match your screen transition function signature
interface TitleScreenDeps {
  onPlay: () => void | Promise<void>;
  onSettings?: () => void;
}

interface TitleScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER (LOCKED STRUCTURE, ADAPTABLE CONTENT)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Title screen controller.
 *
 * Pattern: imperative DOM construction with GSAP entrance animations.
 * The controller owns all DOM it creates and cleans up on destroy().
 *
 * Usage:
 *   const ctrl = createTitleScreen({ onPlay, onSettings });
 *   ctrl.init(containerDiv);
 *   // ... later ...
 *   ctrl.destroy();
 */
function createTitleScreen(deps: TitleScreenDeps): TitleScreenController {
  let wrapper: HTMLDivElement | null = null;
  const elements: HTMLElement[] = [];

  return {
    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: ${BACKGROUND};
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
        overflow: hidden;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      `;

      // ── Logo ──
      let logoEl: HTMLElement;
      if (LOGO_PATH) {
        const img = document.createElement('img');
        img.src = LOGO_PATH;
        img.alt = GAME_TITLE;
        img.style.cssText = 'width: 120px; height: 120px; object-fit: contain;';
        logoEl = img;
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          width: 120px; height: 120px; border-radius: 24px;
          background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 48px;
        `;
        placeholder.textContent = '🎮'; // ADAPT: fallback emoji or remove
        logoEl = placeholder;
      }
      logoEl.style.opacity = '0';
      logoEl.style.transform = 'scale(0)';
      wrapper.appendChild(logoEl);
      elements.push(logoEl);

      // ── Title ──
      const title = document.createElement('h1');
      title.textContent = GAME_TITLE; // ADAPT: game title
      title.style.cssText = `
        margin: 24px 0 0; font-size: 36px; font-weight: 800;
        letter-spacing: -0.5px; text-align: center;
        opacity: 0; transform: translateY(20px);
      `;
      wrapper.appendChild(title);
      elements.push(title);

      // ── Tagline ──
      const tagline = document.createElement('p');
      tagline.textContent = GAME_TAGLINE; // ADAPT: tagline
      tagline.style.cssText = `
        margin: 8px 0 0; font-size: 16px; font-weight: 400;
        opacity: 0; color: rgba(255,255,255,0.7); text-align: center;
      `;
      wrapper.appendChild(tagline);
      elements.push(tagline);

      // ── Spacer ──
      const spacer = document.createElement('div');
      spacer.style.height = '48px';
      wrapper.appendChild(spacer);

      // ── Play Button ──
      const playBtn = createButton(
        'Play', // ADAPT: button label
        BUTTON_PRIMARY_BG,
        BUTTON_PRIMARY_TEXT,
        async () => { await deps.onPlay(); },
      );
      wrapper.appendChild(playBtn);
      elements.push(playBtn);

      // ── Settings Button (optional) ──
      if (SHOW_SETTINGS_BUTTON && deps.onSettings) {
        const settingsBtn = createButton(
          'Settings', // ADAPT: button label
          BUTTON_SECONDARY_BG,
          BUTTON_SECONDARY_TEXT,
          () => deps.onSettings!(),
        );
        settingsBtn.style.marginTop = '12px';
        wrapper.appendChild(settingsBtn);
        elements.push(settingsBtn);
      }

      // ── Version ──
      if (VERSION_STRING) {
        const version = document.createElement('span');
        version.textContent = VERSION_STRING;
        version.style.cssText = `
          position: absolute; bottom: 16px;
          font-size: 12px; color: rgba(255,255,255,0.3);
          opacity: 0;
        `;
        wrapper.appendChild(version);
        elements.push(version);
      }

      container.appendChild(wrapper);

      // ── Entrance animations (LOCKED timing) ──
      animateEntrance(logoEl, title, tagline, playBtn,
        SHOW_SETTINGS_BUTTON ? wrapper.querySelectorAll('button')[1] as HTMLElement | undefined : undefined,
        VERSION_STRING ? wrapper.querySelector('span') as HTMLElement | null : null,
      );
    },

    destroy() {
      // Kill all GSAP tweens on tracked elements before removing DOM
      for (const el of elements) {
        gsap.killTweensOf(el);
      }
      wrapper?.remove();
      wrapper = null;
      elements.length = 0;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: BUTTON FACTORY (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function createButton(
  label: string,
  bgColor: string,
  textColor: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    min-width: 200px; min-height: 48px;
    padding: 14px 32px;
    border: none; border-radius: 12px;
    background: ${bgColor}; color: ${textColor};
    font-size: 18px; font-weight: 700;
    cursor: pointer;
    opacity: 0; transform: scale(0.8);
    -webkit-tap-highlight-color: transparent;
  `;

  btn.addEventListener('pointerover', () => {
    gsap.to(btn, { scale: ANIM.HOVER_SCALE, duration: ANIM.HOVER_DURATION_MS / 1000, ease: 'power2.out' });
  });
  btn.addEventListener('pointerout', () => {
    gsap.to(btn, { scale: 1, duration: ANIM.HOVER_DURATION_MS / 1000, ease: 'power2.out' });
  });
  btn.addEventListener('pointerdown', () => {
    gsap.to(btn, { scale: ANIM.PRESS_SCALE, duration: ANIM.PRESS_DURATION_MS / 1000, ease: 'back.out(1.5)' });
  });
  btn.addEventListener('pointerup', () => {
    gsap.to(btn, { scale: 1, duration: ANIM.PRESS_DURATION_MS / 1000, ease: 'back.out(1.5)' });
    onClick();
  });

  return btn;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: ENTRANCE ANIMATION SEQUENCE (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Staggered entrance animation using GSAP.
 */
function animateEntrance(
  logo: HTMLElement,
  title: HTMLElement,
  tagline: HTMLElement,
  playBtn: HTMLElement,
  settingsBtn?: HTMLElement | null,
  version?: HTMLElement | null,
): void {
  // Logo: scale 0 → 1, fade in with overshoot
  gsap.to(logo, {
    opacity: 1, scale: 1,
    duration: ANIM.LOGO_DURATION_MS / 1000,
    delay: ANIM.LOGO_DELAY_MS / 1000,
    ease: 'back.out(1.7)',
  });

  // Title: slide up 20px, fade in
  gsap.to(title, {
    opacity: 1, y: 0,
    duration: ANIM.TITLE_DURATION_MS / 1000,
    delay: ANIM.TITLE_DELAY_MS / 1000,
    ease: 'power2.out',
  });

  // Tagline: fade in
  gsap.to(tagline, {
    opacity: 1,
    duration: ANIM.TAGLINE_DURATION_MS / 1000,
    delay: ANIM.TAGLINE_DELAY_MS / 1000,
    ease: 'power2.out',
  });

  // Play button: scale 0.8 → 1, fade in with overshoot
  gsap.to(playBtn, {
    opacity: 1, scale: 1,
    duration: ANIM.BUTTON_DURATION_MS / 1000,
    delay: ANIM.BUTTON_FIRST_DELAY_MS / 1000,
    ease: 'back.out(1.3)',
  });

  // Settings button: staggered after play
  if (settingsBtn) {
    gsap.to(settingsBtn, {
      opacity: 1, scale: 1,
      duration: ANIM.BUTTON_DURATION_MS / 1000,
      delay: (ANIM.BUTTON_FIRST_DELAY_MS + ANIM.BUTTON_STAGGER_MS) / 1000,
      ease: 'back.out(1.3)',
    });
  }

  // Version: fade in last
  if (version) {
    gsap.to(version, {
      opacity: 1,
      duration: ANIM.VERSION_DURATION_MS / 1000,
      delay: ANIM.VERSION_DELAY_MS / 1000,
      ease: 'power2.out',
    });
  }
}
