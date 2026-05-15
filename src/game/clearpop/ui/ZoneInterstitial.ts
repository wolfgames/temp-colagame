/* ═══════════════════════════════════════════════════════════════════════
 * Zone Interstitial — full-screen DOM reveal shown after each zone (10 levels).
 * Slides up from below, shows the reward dish, Nana's closing line, then
 * fades out on tap.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { ZoneContent } from '../themes/eigenpop/zones';

// ── Timing ──────────────────────────────────────────────────────────────
const SLIDE_IN_MS   = 500;
const DISH_POP_MS   = 600;
const GLOW_DELAY_MS = 800;
const EXIT_MS       = 400;
const TAP_LOCK_MS   = 800; // prevent instant-tap skip

// ── Style tokens ────────────────────────────────────────────────────────
const BG_GRADIENT   = 'linear-gradient(160deg, #1a0800 0%, #3d1800 55%, #2a0e00 100%)'; // kept in sync with -pixi.ts
const BADGE_BG      = '#C4956A';
const BADGE_COLOR   = '#fff';
const DISH_GLOW     = '0 0 40px 12px rgba(255, 210, 120, 0.55), 0 0 80px 24px rgba(255, 180, 60, 0.25)';
const ORDER_COLOR   = '#C4956A';
const DISH_COLOR    = '#FFF8F0';
const QUOTE_COLOR   = '#d4b896';
const HINT_COLOR    = '#9E6B3A';

export interface ZoneInterstitialDeps {
  content: ZoneContent;
  onComplete: () => void;
}

export interface ZoneInterstitialController {
  destroy(): void;
}

export function createZoneInterstitial(
  container: HTMLDivElement,
  deps: ZoneInterstitialDeps,
): ZoneInterstitialController {
  const { content, onComplete } = deps;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let destroyed = false;
  let tapLocked = true;

  function t(fn: () => void, ms: number): void {
    timers.push(setTimeout(fn, ms));
  }

  // ── Wrapper ────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0; z-index: 60;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: ${BG_GRADIENT};
    user-select: none; -webkit-user-select: none;
    overflow: hidden;
    opacity: 0;
    transform: translateY(40px);
    transition: opacity ${SLIDE_IN_MS}ms ease-out, transform ${SLIDE_IN_MS}ms ease-out;
  `;

  // ── "ORDER COMPLETE" badge ─────────────────────────────────────────────
  const badge = document.createElement('div');
  badge.textContent = 'ORDER COMPLETE';
  badge.style.cssText = `
    background: ${BADGE_BG};
    color: ${BADGE_COLOR};
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 2.5px; text-transform: uppercase;
    padding: 5px 14px; border-radius: 20px;
    margin-bottom: 20px;
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 300ms ease-out 200ms, transform 300ms ease-out 200ms;
  `;

  // ── Order name ─────────────────────────────────────────────────────────
  const orderEl = document.createElement('div');
  orderEl.textContent = content.orderName;
  orderEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px; font-weight: 600;
    letter-spacing: 1.2px; text-transform: uppercase;
    color: ${ORDER_COLOR};
    margin-bottom: 16px;
    opacity: 0;
    transition: opacity 300ms ease-out 350ms;
  `;

  // ── Dish image ─────────────────────────────────────────────────────────
  const dishWrap = document.createElement('div');
  dishWrap.style.cssText = `
    position: relative;
    width: 220px; height: 220px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity ${DISH_POP_MS}ms cubic-bezier(0.34,1.56,0.64,1) ${GLOW_DELAY_MS / 1000}s,
                transform ${DISH_POP_MS}ms cubic-bezier(0.34,1.56,0.64,1) ${GLOW_DELAY_MS / 1000}s;
  `;

  const dishImg = document.createElement('img');
  dishImg.src = content.dishImage;
  dishImg.draggable = false;
  dishImg.alt = content.dishName;
  dishImg.style.cssText = `
    width: 200px; height: 200px;
    object-fit: contain;
    filter: drop-shadow(${DISH_GLOW});
    border-radius: 50%;
  `;

  // Circular glow ring behind the dish
  const glowRing = document.createElement('div');
  glowRing.style.cssText = `
    position: absolute; inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,210,120,0.18) 0%, transparent 70%);
    animation: pulse-glow 2.4s ease-in-out infinite;
  `;

  // Inject keyframes once
  if (!document.getElementById('zone-interstitial-styles')) {
    const style = document.createElement('style');
    style.id = 'zone-interstitial-styles';
    style.textContent = `
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50%       { opacity: 1;   transform: scale(1.08); }
      }
    `;
    document.head.appendChild(style);
  }

  dishWrap.append(glowRing, dishImg);

  // ── Dish name ──────────────────────────────────────────────────────────
  const dishNameEl = document.createElement('div');
  dishNameEl.textContent = content.dishName;
  dishNameEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 26px; font-weight: 700;
    color: ${DISH_COLOR};
    margin-bottom: 12px;
    text-align: center; padding: 0 24px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 300ms ease-out, transform 300ms ease-out;
  `;

  // ── Nana's closing quote ───────────────────────────────────────────────
  const quoteEl = document.createElement('div');
  quoteEl.textContent = content.nanaClosingLine;
  quoteEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px; font-style: italic; line-height: 1.6;
    color: ${QUOTE_COLOR};
    text-align: center; padding: 0 32px;
    max-width: 320px;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 300ms ease-out, transform 300ms ease-out;
  `;

  // ── "Tap to continue" hint ─────────────────────────────────────────────
  const hintEl = document.createElement('div');
  hintEl.textContent = 'TAP TO CONTINUE ›';
  hintEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 1.8px; text-transform: uppercase;
    color: ${HINT_COLOR};
    opacity: 0;
    transition: opacity 400ms ease-out;
  `;

  wrapper.append(badge, orderEl, dishWrap, dishNameEl, quoteEl, hintEl);
  container.appendChild(wrapper);

  // ── Entrance sequence ──────────────────────────────────────────────────
  // Slide wrapper in
  requestAnimationFrame(() => {
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translateY(0)';
  });

  // Staggered reveals
  t(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'scale(1)';
  }, 100);

  t(() => { orderEl.style.opacity = '1'; }, 350);

  t(() => {
    dishWrap.style.opacity = '1';
    dishWrap.style.transform = 'scale(1)';
  }, GLOW_DELAY_MS);

  t(() => {
    dishNameEl.style.opacity = '1';
    dishNameEl.style.transform = 'translateY(0)';
  }, GLOW_DELAY_MS + DISH_POP_MS - 100);

  t(() => {
    quoteEl.style.opacity = '1';
    quoteEl.style.transform = 'translateY(0)';
  }, GLOW_DELAY_MS + DISH_POP_MS + 150);

  t(() => {
    hintEl.style.opacity = '1';
    tapLocked = false;
  }, TAP_LOCK_MS + GLOW_DELAY_MS);

  // ── Exit on tap ────────────────────────────────────────────────────────
  function handleTap(): void {
    if (tapLocked || destroyed) return;
    tapLocked = true;
    wrapper.style.transition = `opacity ${EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`;
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(-20px)';
    t(() => {
      if (!destroyed) onComplete();
    }, EXIT_MS);
  }

  wrapper.addEventListener('click', handleTap);

  return {
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      wrapper.removeEventListener('click', handleTap);
      wrapper.remove();
    },
  };
}
