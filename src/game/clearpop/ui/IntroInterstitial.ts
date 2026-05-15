/* ═══════════════════════════════════════════════════════════════════════
 * Intro Interstitial — magical narrative card shown once at game start.
 * Three tap-through slides before level 1 begins.
 *
 * Theme-agnostic: callers supply the slide text, title, and eyebrow label.
 * ═══════════════════════════════════════════════════════════════════════ */

const EXIT_MS      = 450;
const FADE_MS      = 320;   // cross-fade between slides
const TAP_LOCK_MS  = 800;   // lock after each slide transition

const BG_BASE      = '#0d0810';
const SPARK_COLORS = ['#FFD97D', '#FFC2A1', '#A8DFCA', '#F4B8E4', '#FFF0CC', '#C8A8F0'];
const ACCENT       = '#E8B86D';
const TITLE_COL    = '#FFF8F0';
const BODY_COL     = '#d9c5aa';
const HINT_COL     = '#E8B86D';

// ── Keyframe injection (once) ─────────────────────────────────────────────────
function injectStyles(): void {
  if (document.getElementById('intro-interstitial-styles')) return;
  const s = document.createElement('style');
  s.id = 'intro-interstitial-styles';
  s.textContent = `
    @keyframes ii-twinkle {
      0%   { opacity: 0;    transform: scale(0.4) rotate(0deg); }
      40%  { opacity: 1;    transform: scale(1.1) rotate(20deg); }
      70%  { opacity: 0.7;  transform: scale(0.9) rotate(-10deg); }
      100% { opacity: 0;    transform: scale(0.4) rotate(30deg); }
    }
    @keyframes ii-charm-glow {
      0%, 100% { filter: drop-shadow(0 0 6px #FFD97D) drop-shadow(0 0 14px rgba(255,210,100,0.4)); transform: scale(1)   rotate(-4deg); }
      50%       { filter: drop-shadow(0 0 12px #FFD97D) drop-shadow(0 0 28px rgba(255,165, 60,0.6)); transform: scale(1.06) rotate( 4deg); }
    }
    @keyframes ii-hint-pulse {
      0%, 100% { opacity: 0.55; }
      50%       { opacity: 0.95; }
    }
  `;
  document.head.appendChild(s);
}

// ── Sparks ────────────────────────────────────────────────────────────────────
interface SparkDef { x: number; y: number; size: number; color: string; delay: number; dur: number; shape: 'dot' | 'star' | 'diamond'; }

const SPARK_DEFS: SparkDef[] = [
  { x: 8,  y: 12, size: 5, color: '#FFD97D', delay: 200,  dur: 2400, shape: 'star'    },
  { x: 22, y: 6,  size: 3, color: '#FFF0CC', delay: 600,  dur: 1900, shape: 'dot'     },
  { x: 75, y: 9,  size: 6, color: '#F4B8E4', delay: 100,  dur: 2800, shape: 'diamond' },
  { x: 88, y: 18, size: 4, color: '#A8DFCA', delay: 900,  dur: 2100, shape: 'star'    },
  { x: 93, y: 42, size: 3, color: '#C8A8F0', delay: 400,  dur: 3200, shape: 'dot'     },
  { x: 5,  y: 38, size: 4, color: '#FFD97D', delay: 1200, dur: 2600, shape: 'diamond' },
  { x: 15, y: 65, size: 5, color: '#FFC2A1', delay: 700,  dur: 2200, shape: 'star'    },
  { x: 82, y: 70, size: 3, color: '#FFF0CC', delay: 300,  dur: 1800, shape: 'dot'     },
  { x: 90, y: 82, size: 5, color: '#FFD97D', delay: 800,  dur: 2500, shape: 'star'    },
  { x: 10, y: 85, size: 4, color: '#A8DFCA', delay: 500,  dur: 2900, shape: 'diamond' },
  { x: 48, y: 4,  size: 3, color: '#F4B8E4', delay: 1000, dur: 2000, shape: 'dot'     },
  { x: 55, y: 92, size: 4, color: '#C8A8F0', delay: 150,  dur: 2700, shape: 'star'    },
  { x: 35, y: 88, size: 3, color: '#FFD97D', delay: 1100, dur: 1700, shape: 'dot'     },
  { x: 68, y: 94, size: 5, color: '#FFC2A1', delay: 650,  dur: 3100, shape: 'diamond' },
  { x: 28, y: 15, size: 4, color: '#FFF0CC', delay: 450,  dur: 2300, shape: 'star'    },
  { x: 62, y: 10, size: 3, color: '#A8DFCA', delay: 850,  dur: 2050, shape: 'dot'     },
  { x: 78, y: 55, size: 4, color: '#F4B8E4', delay: 250,  dur: 2750, shape: 'diamond' },
  { x: 3,  y: 55, size: 3, color: '#C8A8F0', delay: 1050, dur: 1950, shape: 'dot'     },
];

function buildSpark(def: SparkDef): HTMLElement {
  const el = document.createElement('div');
  const isRotated = def.shape === 'diamond';
  const isStar    = def.shape === 'star';
  el.textContent  = isStar ? '✦' : '';
  el.style.cssText = `
    position: absolute;
    left: ${def.x}%; top: ${def.y}%;
    width: ${def.size}px; height: ${def.size}px;
    border-radius: ${isRotated ? '1px' : isStar ? '0' : '50%'};
    background: ${isStar ? 'transparent' : def.color};
    color: ${def.color};
    font-size: ${def.size * (isStar ? 2.4 : 1)}px;
    line-height: 1;
    transform: ${isRotated ? 'rotate(45deg) scale(0.4)' : 'scale(0.4)'};
    opacity: 0; pointer-events: none;
    animation: ii-twinkle ${def.dur}ms ease-in-out ${def.delay}ms infinite;
    filter: drop-shadow(0 0 3px ${def.color});
  `;
  return el;
}

function buildDivider(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = `display: flex; align-items: center; gap: 10px; margin-bottom: 20px; opacity: 0; transition: opacity 400ms ease-out; width: 100%;`;
  const line = (flex: string) => {
    const l = document.createElement('div');
    l.style.cssText = `height: 1px; background: ${ACCENT}; opacity: 0.4; flex: ${flex};`;
    return l;
  };
  const gem = document.createElement('span');
  gem.textContent = '✦';
  gem.style.cssText = `font-size: 10px; color: ${ACCENT}; opacity: 0.8; line-height: 1;`;
  wrap.append(line('1'), gem, line('1'));
  return wrap;
}

// ── Public factory ────────────────────────────────────────────────────────────
export interface IntroInterstitialDeps {
  /** Slide bodies, one per tap. */
  slides: readonly string[];
  /** Title shown above the slides (e.g. "A Little Problem"). */
  title: string;
  /** Eyebrow label above the title (e.g. "NANA ROSE'S CAFÉ"). */
  eyebrow: string;
  onComplete: () => void;
}
export interface IntroInterstitialController { destroy(): void; }

export function createIntroInterstitial(
  container: HTMLDivElement,
  deps: IntroInterstitialDeps,
): IntroInterstitialController {
  const { onComplete, slides: SLIDES, title: titleText, eyebrow: eyebrowText } = deps;
  injectStyles();

  const timers: ReturnType<typeof setTimeout>[] = [];
  let destroyed  = false;
  let tapLocked  = true;
  let slideIndex = 0;

  function t(fn: () => void, ms: number): void { timers.push(setTimeout(fn, ms)); }

  // ── Wrapper ───────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0; z-index: 70;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: ${BG_BASE};
    user-select: none; -webkit-user-select: none;
    overflow: hidden; opacity: 0;
    transition: opacity 600ms ease-out;
  `;

  // ── Radial glows ──────────────────────────────────────────────────────────
  const glowA = document.createElement('div');
  glowA.style.cssText = `
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 55% at 50% 38%, rgba(196,149,106,0.18) 0%, transparent 70%),
      radial-gradient(ellipse 50% 35% at 50% 32%, rgba(255,210,120,0.10) 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 30% 70%, rgba(168,223,202,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 70% 75%, rgba(200,168,240,0.06) 0%, transparent 60%);
  `;

  // ── Sparks ────────────────────────────────────────────────────────────────
  const sparkLayer = document.createElement('div');
  sparkLayer.style.cssText = `position: absolute; inset: 0; pointer-events: none;`;
  SPARK_DEFS.forEach(def => sparkLayer.appendChild(buildSpark(def)));

  // ── Card ──────────────────────────────────────────────────────────────────
  const card = document.createElement('div');
  card.style.cssText = `
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center;
    max-width: 360px; width: 100%;
    padding: 0 28px;
  `;

  // Charm icon
  const charmEl = document.createElement('div');
  charmEl.textContent = '✦';
  charmEl.style.cssText = `
    font-size: 42px; color: #FFD97D; line-height: 1;
    margin-bottom: 18px; opacity: 0;
    transform: scale(0.3) rotate(-30deg);
    transition: opacity 600ms cubic-bezier(0.34,1.56,0.64,1) 200ms,
                transform 600ms cubic-bezier(0.34,1.56,0.64,1) 200ms;
  `;

  // Eyebrow
  const eyebrowEl = document.createElement('div');
  eyebrowEl.textContent = eyebrowText;
  eyebrowEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 3.5px; text-transform: uppercase;
    color: ${ACCENT}; margin-bottom: 12px;
    opacity: 0; transition: opacity 350ms ease-out;
  `;

  // Title
  const titleEl = document.createElement('div');
  titleEl.textContent = titleText;
  titleEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 28px; font-weight: 700; line-height: 1.2;
    color: ${TITLE_COL}; text-align: center;
    margin-bottom: 16px; opacity: 0;
    transform: translateY(12px);
    transition: opacity 500ms ease-out, transform 500ms ease-out;
    text-shadow: 0 2px 20px rgba(255,180,60,0.25);
  `;

  // Divider
  const divider = buildDivider();

  // Body text — slides in and out
  const bodyEl = document.createElement('div');
  bodyEl.textContent = SLIDES[0];
  bodyEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px; line-height: 1.75;
    color: ${BODY_COL}; text-align: center;
    margin-bottom: 32px; min-height: 100px;
    opacity: 0;
    transition: opacity ${FADE_MS}ms ease-out;
  `;

  // Progress dots
  const dotsWrap = document.createElement('div');
  dotsWrap.style.cssText = `
    display: flex; gap: 7px; margin-bottom: 24px;
    opacity: 0; transition: opacity 300ms ease-out;
  `;
  const dots = SLIDES.map((_, i) => {
    const d = document.createElement('div');
    d.style.cssText = `
      width: 5px; height: 5px; border-radius: 50%;
      background: ${i === 0 ? ACCENT : 'rgba(255,255,255,0.2)'};
      transition: background 300ms ease-out;
    `;
    dotsWrap.appendChild(d);
    return d;
  });

  // Hint / CTA
  const hintEl = document.createElement('div');
  hintEl.textContent = 'TAP TO CONTINUE ›';
  hintEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 2.5px; text-transform: uppercase;
    color: ${HINT_COL}; opacity: 0;
    transition: opacity 400ms ease-out;
  `;

  card.append(charmEl, eyebrowEl, titleEl, divider, bodyEl, dotsWrap, hintEl);
  wrapper.append(glowA, sparkLayer, card);
  container.appendChild(wrapper);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateDots(index: number): void {
    dots.forEach((d, i) => {
      d.style.background = i === index ? ACCENT : 'rgba(255,255,255,0.2)';
    });
  }

  function showHint(isLast: boolean): void {
    hintEl.textContent = isLast ? '✦  TAP TO START  ✦' : 'TAP TO CONTINUE ›';
    hintEl.style.animation = isLast ? 'ii-hint-pulse 3s ease-in-out infinite' : 'none';
    hintEl.style.opacity = '1';
  }

  // ── Entrance ──────────────────────────────────────────────────────────────
  requestAnimationFrame(() => { wrapper.style.opacity = '1'; });

  t(() => {
    charmEl.style.opacity   = '1';
    charmEl.style.transform = 'scale(1) rotate(0deg)';
    setTimeout(() => {
      charmEl.style.transition = 'none';
      charmEl.style.animation  = 'ii-charm-glow 2.8s ease-in-out infinite';
    }, 650);
  }, 150);

  t(() => { eyebrowEl.style.opacity = '1'; }, 450);
  t(() => { titleEl.style.opacity = '1'; titleEl.style.transform = 'translateY(0)'; }, 600);
  t(() => { divider.style.opacity = '1'; }, 800);
  t(() => { bodyEl.style.opacity = '1'; }, 900);
  t(() => { dotsWrap.style.opacity = '1'; }, 1000);
  t(() => {
    showHint(false);
    tapLocked = false;
  }, TAP_LOCK_MS + 400);

  // ── Tap handler ───────────────────────────────────────────────────────────
  function handleTap(): void {
    if (tapLocked || destroyed) return;

    const isLast = slideIndex >= SLIDES.length - 1;

    if (isLast) {
      // Exit
      tapLocked = true;
      wrapper.style.transition = `opacity ${EXIT_MS}ms ease-in`;
      wrapper.style.opacity    = '0';
      t(() => { if (!destroyed) onComplete(); }, EXIT_MS);
      return;
    }

    // Advance to next slide
    tapLocked = true;
    hintEl.style.opacity = '0';
    bodyEl.style.opacity = '0';

    t(() => {
      slideIndex++;
      bodyEl.textContent = SLIDES[slideIndex];
      updateDots(slideIndex);
      bodyEl.style.opacity = '1';
      t(() => {
        showHint(slideIndex === SLIDES.length - 1);
        tapLocked = false;
      }, FADE_MS + 200);
    }, FADE_MS);
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
