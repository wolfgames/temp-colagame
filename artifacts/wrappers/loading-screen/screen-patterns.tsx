/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Loading Screen
 *
 * Asset preload with progress bar. First screen shown at app boot.
 * DOM-based (always DOM — GPU isn't initialized yet).
 *
 * Production-tested pattern pulled from ClearPop game implementation.
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: background color
const BACKGROUND = '#BCE083';

// ADAPT: logo path (null = text-only)
const LOGO_PATH: string | null = null;

// ADAPT: loading tips (shown randomly, null = no tips)
const LOADING_TIPS: string[] | null = [
  'Tip: Bigger groups earn more points!',
  'Tip: Small clears create obstacles — plan ahead!',
  'Tip: Power-ups can destroy obstacles!',
];

// ADAPT: bundle prefix order — these are matched against your asset manifest
// Each entry loads all bundles whose name starts with that prefix.
const BUNDLE_PREFIX_ORDER = ['boot-', 'theme-', 'core-', 'audio-'];

// ADAPT: timeout before showing retry button (ms)
const LOAD_TIMEOUT_MS = 15000;

// ADAPT: progress bar colors
const PROGRESS_BG = 'rgba(255, 255, 255, 0.3)';
const PROGRESS_FILL = '#555555';
const PROGRESS_WIDTH = '256px';

// ADAPT: text colors
const TEXT_COLOR = '#333333';
const TEXT_MUTED = 'rgba(0, 0, 0, 0.4)';
const TEXT_ERROR = '#e63946';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  LOGO_DELAY_MS: 200,
  LOGO_DURATION_MS: 400,          // power2.out
  STATUS_DELAY_MS: 400,
  STATUS_DURATION_MS: 200,        // power2.out
  BAR_DELAY_MS: 500,
  BAR_ENTRANCE_MS: 300,           // power2.out
  BAR_FILL_STEP_MS: 200,          // power2.out (CSS transition)
  TIP_DELAY_MS: 800,
  TIP_DURATION_MS: 300,           // power2.out
  ERROR_ENTRANCE_MS: 300,         // power2.out
  EXIT_FADE_MS: 400,              // power2.in
  POST_LOAD_PAUSE_MS: 300,        // brief pause after load before transition
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: match your asset coordinator / manifest interface
interface BundleInfo {
  name: string;
}

interface LoadingScreenDeps {
  /** All available bundles from the manifest */
  bundles: BundleInfo[];
  /** Load a single bundle by name */
  loadBundle: (name: string) => Promise<void>;
  /** Called when loading completes — typically goto('start') or goto('game') */
  onComplete: () => void;
  /** Optional: unlock audio (for dev-mode skip-to-game) */
  unlockAudio?: () => void;
  /** Optional: init GPU (for dev-mode skip-to-game) */
  initGpu?: () => Promise<void>;
  /** Optional: skip start screen and go directly to game */
  skipToGame?: boolean;
}

interface LoadingScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════ */

function createLoadingScreen(deps: LoadingScreenDeps): LoadingScreenController {
  let wrapper: HTMLDivElement | null = null;
  let progressFill: HTMLDivElement | null = null;
  let statusEl: HTMLSpanElement | null = null;
  let retryBtn: HTMLButtonElement | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;

  // Resolve bundle names from prefixes against actual manifest
  function resolveBundles(): string[] {
    const prefixes = deps.skipToGame
      ? BUNDLE_PREFIX_ORDER                          // load everything for skip-to-game
      : BUNDLE_PREFIX_ORDER.slice(0, 2);             // just boot + theme for normal flow
    const resolved: string[] = [];
    for (const prefix of prefixes) {
      for (const b of deps.bundles) {
        if (b.name.startsWith(prefix)) resolved.push(b.name);
      }
    }
    return resolved;
  }

  async function startLoading(): Promise<void> {
    const bundles = resolveBundles();
    const total = bundles.length;
    if (total === 0) { finishLoading(); return; }
    let loaded = 0;

    // Start timeout
    timeoutTimer = setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Loading is taking longer than expected...';
      showRetryButton();
    }, LOAD_TIMEOUT_MS);

    try {
      for (const name of bundles) {
        if (aborted) return;
        if (statusEl) statusEl.textContent = `Loading ${name.replace(/-/g, ' ')}...`;
        await deps.loadBundle(name);
        loaded++;
        setProgress(loaded / total);
      }

      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (aborted) return;

      // Dev mode: skip-to-game path — init GPU + load remaining bundles
      if (deps.skipToGame) {
        if (statusEl) statusEl.textContent = 'Initializing...';
        deps.unlockAudio?.();
        await deps.initGpu?.();
      }

      finishLoading();
    } catch (err) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      console.error('[loading-screen] Bundle load failed:', err);
      if (statusEl) statusEl.textContent = 'Failed to load assets.';
      showRetryButton();
    }
  }

  function finishLoading(): void {
    if (statusEl) statusEl.textContent = 'Ready!';
    setProgress(1);

    // Brief pause then fade out (LOCKED timing)
    setTimeout(() => {
      if (!wrapper || aborted) return;
      gsap.to(wrapper, {
        opacity: 0,
        duration: ANIM.EXIT_FADE_MS / 1000,
        ease: 'power2.in',
        onComplete: () => deps.onComplete(),
      });
    }, ANIM.POST_LOAD_PAUSE_MS);
  }

  function setProgress(fraction: number): void {
    if (progressFill) {
      gsap.to(progressFill, {
        width: `${Math.round(fraction * 100)}%`,
        duration: ANIM.BAR_FILL_STEP_MS / 1000,
        ease: 'power2.out',
      });
    }
  }

  function showRetryButton(): void {
    if (!retryBtn) return;
    retryBtn.style.display = 'block';
    gsap.fromTo(retryBtn,
      { opacity: 0 },
      { opacity: 1, duration: ANIM.ERROR_ENTRANCE_MS / 1000, ease: 'power2.out' },
    );
  }

  return {
    init(container: HTMLDivElement) {
      aborted = false;
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: ${BACKGROUND};
        font-family: system-ui, -apple-system, sans-serif;
        color: ${TEXT_COLOR};
        touch-action: none; user-select: none; -webkit-user-select: none;
      `;

      // ── Logo ──
      let logoEl: HTMLElement;
      if (LOGO_PATH) {
        const img = document.createElement('img');
        img.src = LOGO_PATH;
        img.alt = 'Game Logo';
        img.style.cssText = 'width: 100px; height: 100px; object-fit: contain;';
        logoEl = img;
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          width: 80px; height: 80px; border-radius: 16px;
          background: rgba(0,0,0,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
        `;
        placeholder.textContent = '\uD83C\uDFAE'; // ADAPT: fallback emoji
        logoEl = placeholder;
      }
      logoEl.style.opacity = '0';
      wrapper.appendChild(logoEl);
      gsap.to(logoEl, {
        opacity: 1,
        duration: ANIM.LOGO_DURATION_MS / 1000,
        delay: ANIM.LOGO_DELAY_MS / 1000,
        ease: 'power2.out',
      });

      // ── Status text ──
      statusEl = document.createElement('span');
      statusEl.textContent = 'Loading...';
      statusEl.style.cssText = `
        margin-top: 24px; font-size: 14px;
        color: ${TEXT_MUTED};
        opacity: 0;
      `;
      wrapper.appendChild(statusEl);
      gsap.to(statusEl, {
        opacity: 1,
        duration: ANIM.STATUS_DURATION_MS / 1000,
        delay: ANIM.STATUS_DELAY_MS / 1000,
        ease: 'power2.out',
      });

      // ── Progress bar ──
      const barOuter = document.createElement('div');
      barOuter.style.cssText = `
        margin-top: 16px; width: ${PROGRESS_WIDTH}; height: 6px;
        background: ${PROGRESS_BG}; border-radius: 3px;
        overflow: hidden; opacity: 0;
      `;

      progressFill = document.createElement('div');
      progressFill.style.cssText = `
        width: 0%; height: 100%;
        background: ${PROGRESS_FILL}; border-radius: 3px;
      `;
      barOuter.appendChild(progressFill);
      wrapper.appendChild(barOuter);

      gsap.to(barOuter, {
        opacity: 1,
        duration: ANIM.BAR_ENTRANCE_MS / 1000,
        delay: ANIM.BAR_DELAY_MS / 1000,
        ease: 'power2.out',
      });

      // ── Loading tip ──
      if (LOADING_TIPS && LOADING_TIPS.length > 0) {
        const tip = document.createElement('p');
        tip.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
        tip.style.cssText = `
          margin-top: 32px; font-size: 13px;
          color: ${TEXT_MUTED};
          text-align: center; max-width: 280px;
          opacity: 0;
        `;
        wrapper.appendChild(tip);
        gsap.to(tip, {
          opacity: 1,
          duration: ANIM.TIP_DURATION_MS / 1000,
          delay: ANIM.TIP_DELAY_MS / 1000,
          ease: 'power2.out',
        });
      }

      // ── Retry button (hidden by default) ──
      retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry'; // ADAPT: retry label
      retryBtn.style.cssText = `
        display: none; margin-top: 24px;
        min-width: 120px; min-height: 48px;
        padding: 12px 24px; border: none; border-radius: 10px;
        background: ${TEXT_ERROR}; color: #ffffff;
        font-size: 16px; font-weight: 700; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      `;
      retryBtn.addEventListener('click', () => {
        retryBtn!.style.display = 'none';
        if (statusEl) statusEl.textContent = 'Retrying...';
        setProgress(0);
        void startLoading();
      });
      wrapper.appendChild(retryBtn);

      container.appendChild(wrapper);

      // Start loading bundles
      void startLoading();
    },

    destroy() {
      aborted = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
      progressFill = null;
      statusEl = null;
      retryBtn = null;
    },
  };
}
