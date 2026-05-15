/**
 * Start Screen View — Variant Title Screen
 *
 * Layout is fixed (logo, tagline, play button). All brand surface
 * (logo path, background gradient, CTA gradient, tagline color) comes
 * from `theme.branding` so the screen morphs with the active variant.
 */

import gsap from 'gsap';
import type {
  StartScreenDeps,
  StartScreenController,
  SetupStartScreen,
} from '~/game/mygame-contract';
import { getActiveVariant } from '~/game/clearpop/variants';

const THEME    = getActiveVariant().theme;
const STRINGS  = THEME.strings;
const BRANDING = THEME.branding;

/** Convert `#rrggbb` (or `#rgb`) → `rgba(r, g, b, alpha)`. Lets us derive
 *  drop-shadow / box-shadow / version-text tints from the theme's brand
 *  palette instead of hardcoding eigenpop-flavoured rgba triples. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const GAME_TITLE   = STRINGS.start.title;
const GAME_TAGLINE = STRINGS.start.tagline;
const LOGO_SRC     = BRANDING.logo;
const BG_COLOR     = BRANDING.bgColor;
const BG_BACKGROUND = BRANDING.bgGradient ?? BRANDING.bgColor;
const CTA_GRADIENT = `linear-gradient(135deg, ${BRANDING.ctaGradient.from} 0%, ${BRANDING.ctaGradient.to} 100%)`;
const TAGLINE_COLOR = BRANDING.taglineColor;
// Derived brand shadows / muted text — keep alpha values fixed (these are
// design intent), only the hue shifts with the theme.
const LOGO_SHADOW       = hexToRgba(BRANDING.taglineColor, 0.22);
const CTA_SHADOW        = hexToRgba(BRANDING.ctaGradient.to, 0.4);
const CTA_SHADOW_PULSE  = hexToRgba(BRANDING.ctaGradient.to, 0.55);
const VERSION_COLOR     = hexToRgba(BRANDING.taglineColor, 0.35);
const VERSION_STRING: string | null = 'v0.1.0';

const ANIM = {
  LOGO_DELAY_MS: 200,
  LOGO_DURATION_MS: 600,
  TAGLINE_DELAY_MS: 600,
  TAGLINE_DURATION_MS: 400,
  BUTTON_DELAY_MS: 850,
  BUTTON_DURATION_MS: 400,
  VERSION_DELAY_MS: 1100,
  VERSION_DURATION_MS: 200,
} as const;

export const setupStartScreen: SetupStartScreen = (deps: StartScreenDeps): StartScreenController => {
  let wrapper: HTMLDivElement | null = null;
  let pulseTween: gsap.core.Tween | null = null;

  return {
    backgroundColor: BG_COLOR,

    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        height: 100%; gap: 0;
        font-family: 'Baloo 2', 'Nunito', system-ui, -apple-system, sans-serif;
        touch-action: none; user-select: none; -webkit-user-select: none;
        background: ${BG_BACKGROUND};
      `;

      // ── Logo ──
      const logo = document.createElement('img');
      logo.src = LOGO_SRC;
      logo.alt = GAME_TITLE;
      logo.draggable = false;
      logo.style.cssText = `
        width: min(82vw, 360px); height: auto;
        opacity: 0; transform: scale(0);
        filter: drop-shadow(0 8px 24px ${LOGO_SHADOW});
      `;

      // ── Title (screen-reader only) ──
      const title = document.createElement('h1');
      title.textContent = GAME_TITLE;
      title.style.cssText = `
        position: absolute; width: 1px; height: 1px;
        overflow: hidden; clip: rect(0,0,0,0);
      `;

      // ── Tagline ──
      const tagline = document.createElement('p');
      tagline.textContent = GAME_TAGLINE;
      tagline.style.cssText = `
        font-size: 1.2rem; font-weight: 700; margin: 16px 0 0;
        color: ${TAGLINE_COLOR};
        letter-spacing: 2.5px; text-transform: uppercase;
        opacity: 0;
      `;

      // ── Play Button ──
      const playBtn = document.createElement('button');
      playBtn.textContent = STRINGS.start.play;
      playBtn.style.cssText = `
        margin-top: 44px;
        font-size: 1.35rem; font-weight: 800; letter-spacing: 0.5px;
        padding: 16px 64px; border: none; border-radius: 50px;
        background: ${CTA_GRADIENT};
        color: #ffffff;
        cursor: pointer; min-height: 52px;
        font-family: 'Baloo 2', 'Nunito', system-ui, -apple-system, sans-serif;
        box-shadow: 0 6px 20px ${CTA_SHADOW}, 0 2px 6px rgba(0,0,0,0.1);
        opacity: 0; transform: scale(0.8);
        -webkit-tap-highlight-color: transparent;
        text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        transition: transform 0.1s ease;
      `;

      playBtn.addEventListener('pointerover', () => { playBtn.style.transform = 'scale(1.06)'; });
      playBtn.addEventListener('pointerout', () => { playBtn.style.transform = 'scale(1)'; });
      playBtn.addEventListener('pointerdown', () => { playBtn.style.transform = 'scale(0.94)'; });

      playBtn.addEventListener('click', async () => {
        if (playBtn.disabled) return;
        if (pulseTween) { pulseTween.kill(); pulseTween = null; }
        playBtn.disabled = true;
        playBtn.textContent = STRINGS.start.loading;
        playBtn.style.opacity = '0.7';

        // Safety net: if the chain doesn't reach goto('game') in 8 s, recover
        // the button so the user can retry instead of staring at "Loading...".
        // Triggered in practice when initGpu or analytics stall — audio is
        // already non-blocking below.
        let recovered = false;
        const recover = (label: string) => {
          if (recovered) return;
          recovered = true;
          console.error(`[StartScreen] watchdog: ${label}`);
          playBtn.disabled = false;
          playBtn.textContent = STRINGS.start.play;
          playBtn.style.opacity = '1';
        };
        const watchdog = setTimeout(() => recover('8s elapsed without goto'), 8_000);

        try {
          await deps.unlockAudio();
          await deps.initGpu();
          await deps.loadCore();
          // Audio is optional for entering the game. Fire-and-forget so a slow
          // CDN→fallback chain (e.g. when a project slug is missing → 404 →
          // local refetch, repeated per bundle) can't gate `goto('game')`.
          // Sounds become available a few hundred ms later; if an early SFX is
          // missed in that window it's a benign miss, not a stuck title.
          void deps.loadAudio().catch((e) => {
            console.warn('[StartScreen] background audio load failed:', e);
          });

          deps.analytics.trackGameStart({
            start_source: 'title_screen',
            is_returning_player: localStorage.getItem('uid') !== null,
          });
          deps.goto('game');
          clearTimeout(watchdog);
        } catch (err) {
          clearTimeout(watchdog);
          console.error('[StartScreen] failed to enter game:', err);
          playBtn.disabled = false;
          playBtn.textContent = STRINGS.start.play;
          playBtn.style.opacity = '1';
        }
      });

      // ── Version ──
      let versionEl: HTMLElement | null = null;
      if (VERSION_STRING) {
        versionEl = document.createElement('span');
        versionEl.textContent = VERSION_STRING;
        versionEl.style.cssText = `
          position: absolute; bottom: 16px;
          font-size: 12px; color: ${VERSION_COLOR};
          opacity: 0;
        `;
      }

      wrapper.append(logo, title, tagline, playBtn);
      if (versionEl) wrapper.appendChild(versionEl);
      container.appendChild(wrapper);

      // ── Entrance animations ──
      gsap.to(logo, {
        opacity: 1, scale: 1,
        duration: ANIM.LOGO_DURATION_MS / 1000,
        delay: ANIM.LOGO_DELAY_MS / 1000,
        ease: 'back.out(1.7)',
      });
      gsap.to(tagline, {
        opacity: 1,
        duration: ANIM.TAGLINE_DURATION_MS / 1000,
        delay: ANIM.TAGLINE_DELAY_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(playBtn, {
        opacity: 1, scale: 1,
        duration: ANIM.BUTTON_DURATION_MS / 1000,
        delay: ANIM.BUTTON_DELAY_MS / 1000,
        ease: 'back.out(1.5)',
        onComplete: () => {
          pulseTween = gsap.to(playBtn, {
            scale: 1.05,
            boxShadow: `0 8px 28px ${CTA_SHADOW_PULSE}, 0 2px 8px rgba(0,0,0,0.12)`,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        },
      });
      if (versionEl) {
        gsap.to(versionEl, {
          opacity: 1,
          duration: ANIM.VERSION_DURATION_MS / 1000,
          delay: ANIM.VERSION_DELAY_MS / 1000,
          ease: 'power2.out',
        });
      }
    },

    destroy() {
      if (pulseTween) { pulseTween.kill(); pulseTween = null; }
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
    },
  };
};
