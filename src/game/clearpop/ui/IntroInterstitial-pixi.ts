/* ═══════════════════════════════════════════════════════════════════════
 * Intro Interstitial (Pixi) — character-forward narrative slides.
 * Nana illustration occupies the lower screen; story text sits above her.
 * Three tap-through slides before level 1 begins.
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { Assets, Container, FillGradient, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const EXIT_MS     = 450;
const FADE_MS     = 300;
const TAP_LOCK_MS = 800;

const COL_BG      = 0x0d0810;
const COL_ACCENT  = 0xe8b86d;
const COL_TITLE   = 0xfff8f0;
const COL_BODY    = 0xd9c5aa;
const COL_HINT    = 0xe8b86d;
const COL_DOT_OFF = 0x4d3a28;
const COL_DOT_ON  = 0xffd97d;
const COL_DIVIDER = 0xc4956a;

interface SparkDef {
  xPct: number; yPct: number; size: number; color: number;
  delay: number; dur: number; shape: 'dot' | 'star' | 'diamond';
}

const SPARK_DEFS: SparkDef[] = [
  { xPct: 8,  yPct: 12, size: 5, color: 0xffd97d, delay: 0.2,  dur: 2.4,  shape: 'star'    },
  { xPct: 22, yPct: 6,  size: 3, color: 0xfff0cc, delay: 0.6,  dur: 1.9,  shape: 'dot'     },
  { xPct: 75, yPct: 9,  size: 6, color: 0xf4b8e4, delay: 0.1,  dur: 2.8,  shape: 'diamond' },
  { xPct: 88, yPct: 18, size: 4, color: 0xa8dfca, delay: 0.9,  dur: 2.1,  shape: 'star'    },
  { xPct: 93, yPct: 42, size: 3, color: 0xc8a8f0, delay: 0.4,  dur: 3.2,  shape: 'dot'     },
  { xPct: 5,  yPct: 38, size: 4, color: 0xffd97d, delay: 1.2,  dur: 2.6,  shape: 'diamond' },
  { xPct: 15, yPct: 65, size: 5, color: 0xffc2a1, delay: 0.7,  dur: 2.2,  shape: 'star'    },
  { xPct: 82, yPct: 70, size: 3, color: 0xfff0cc, delay: 0.3,  dur: 1.8,  shape: 'dot'     },
  { xPct: 90, yPct: 82, size: 5, color: 0xffd97d, delay: 0.8,  dur: 2.5,  shape: 'star'    },
  { xPct: 10, yPct: 85, size: 4, color: 0xa8dfca, delay: 0.5,  dur: 2.9,  shape: 'diamond' },
  { xPct: 48, yPct: 4,  size: 3, color: 0xf4b8e4, delay: 1.0,  dur: 2.0,  shape: 'dot'     },
  { xPct: 55, yPct: 92, size: 4, color: 0xc8a8f0, delay: 0.15, dur: 2.7,  shape: 'star'    },
  { xPct: 35, yPct: 88, size: 3, color: 0xffd97d, delay: 1.1,  dur: 1.7,  shape: 'dot'     },
  { xPct: 68, yPct: 94, size: 5, color: 0xffc2a1, delay: 0.65, dur: 3.1,  shape: 'diamond' },
  { xPct: 28, yPct: 15, size: 4, color: 0xfff0cc, delay: 0.45, dur: 2.3,  shape: 'star'    },
  { xPct: 62, yPct: 10, size: 3, color: 0xa8dfca, delay: 0.85, dur: 2.05, shape: 'dot'     },
  { xPct: 78, yPct: 55, size: 4, color: 0xf4b8e4, delay: 0.25, dur: 2.75, shape: 'diamond' },
  { xPct: 3,  yPct: 55, size: 3, color: 0xc8a8f0, delay: 1.05, dur: 1.95, shape: 'dot'     },
];

export interface IntroInterstitialPixiDeps {
  width: number;
  height: number;
  /** Slide bodies, one per tap. */
  slides: readonly string[];
  /** Title shown above the slides. */
  title: string;
  /** Eyebrow label above the title (small uppercase line). */
  eyebrow: string;
  /** Companion portrait URL per slide. Pads to slides.length with the first url. */
  companionImages: readonly string[];
  onComplete: () => void;
}

export interface IntroInterstitialPixiController {
  destroy(): void;
}

export function createIntroInterstitialPixi(
  parent: Container,
  deps: IntroInterstitialPixiDeps,
): IntroInterstitialPixiController {
  const {
    width,
    height,
    onComplete,
    slides: SLIDES,
    title: titleText,
    eyebrow: eyebrowText,
    companionImages,
  } = deps;
  const SLIDE_NANA: readonly string[] = SLIDES.map((_, i) =>
    companionImages[i] ?? companionImages[0] ?? '',
  );

  let destroyed   = false;
  let slideIndex  = 0;
  let tapLocked   = true;
  const sparkTweens: gsap.core.Tween[] = [];

  let nanaTexMap: Map<string, Texture> | null = null;
  let nanaSprite: Sprite | null = null;

  // ── Root ──────────────────────────────────────────────────────────────
  const root = new Container();
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.hitArea = new Rectangle(0, 0, width, height);
  root.interactiveChildren = true;
  root.alpha = 0;
  parent.addChild(root);

  // ── Background ────────────────────────────────────────────────────────
  const bg = new Graphics().rect(0, 0, width, height).fill(COL_BG);
  root.addChild(bg);

  // Warm radial glow — offset up toward text area
  const glowGradient = new FillGradient({
    type: 'radial',
    center: { x: 0.5, y: 0.32 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.32 },
    outerRadius: 0.55,
    textureSpace: 'local',
    colorStops: [
      { offset: 0,    color: { r: 196, g: 149, b: 106, a: 0.20 } },
      { offset: 0.45, color: { r: 255, g: 210, b: 120, a: 0.10 } },
      { offset: 1,    color: { r: 0,   g: 0,   b: 0,   a: 0   } },
    ],
  });
  const glow = new Graphics().rect(0, 0, width, height).fill(glowGradient);
  root.addChild(glow);

  // ── Nana illustration — lower screen ──────────────────────────────────
  // Fills ~50% of screen height; bottom lands at 90%, leaving space for the hint.
  const NANA_BOTTOM_Y = height * 0.90;
  const NANA_TARGET_H = height * 0.50;

  const nanaContainer = new Container();
  nanaContainer.position.set(width / 2, NANA_BOTTOM_Y + 40);
  nanaContainer.alpha = 0;
  root.addChild(nanaContainer);

  const uniqueNanaPaths = [...new Set(SLIDE_NANA.filter(Boolean))];
  Promise.all(uniqueNanaPaths.map(url => Assets.load<Texture>(url)))
    .then((textures) => {
      if (destroyed) return;
      nanaTexMap = new Map();
      uniqueNanaPaths.forEach((url, i) => nanaTexMap!.set(url, textures[i]!));

      const firstUrl = SLIDE_NANA[slideIndex] ?? SLIDE_NANA[0]!;
      const firstTex = nanaTexMap.get(firstUrl);
      if (!firstTex) return;

      const scale = NANA_TARGET_H / firstTex.height;
      nanaSprite = new Sprite(firstTex);
      nanaSprite.anchor.set(0.5, 1);
      nanaSprite.scale.set(scale);
      nanaContainer.addChild(nanaSprite);

      gsap.to(nanaContainer, {
        y: NANA_BOTTOM_Y,
        alpha: 1,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.1,
      });
    })
    .catch(() => { /* graceful — text-only fallback */ });

  // ── Sparkles ───────────────────────────────────────────────────────────
  const sparkLayer = new Container();
  sparkLayer.eventMode = 'none';
  root.addChild(sparkLayer);

  for (const def of SPARK_DEFS) {
    const sx = (def.xPct / 100) * width;
    const sy = (def.yPct / 100) * height;
    let node: Container;

    if (def.shape === 'star') {
      const t = new Text({
        text: '✦',
        style: { fontFamily: FONT_STACK, fontSize: def.size * 2.4, fill: def.color },
      });
      t.anchor.set(0.5);
      node = t;
    } else if (def.shape === 'diamond') {
      const g = new Graphics();
      g.rect(-def.size / 2, -def.size / 2, def.size, def.size).fill(def.color);
      g.rotation = Math.PI / 4;
      node = g;
    } else {
      const g = new Graphics();
      g.circle(0, 0, def.size / 2).fill(def.color);
      node = g;
    }

    node.position.set(sx, sy);
    node.alpha = 0;
    node.scale.set(0.4);
    sparkLayer.addChild(node);

    const tw = gsap.to(node, {
      keyframes: [
        { alpha: 0,   scale: 0.4, duration: 0 },
        { alpha: 1,   scale: 1.1, duration: def.dur * 0.4, ease: 'power2.out' },
        { alpha: 0.7, scale: 0.9, duration: def.dur * 0.3, ease: 'sine.inOut' },
        { alpha: 0,   scale: 0.4, duration: def.dur * 0.3, ease: 'power2.in'  },
      ],
      delay: def.delay,
      repeat: -1,
    });
    sparkTweens.push(tw);
  }

  // ── Text layout — compact block in upper ~30% of screen ──────────────
  const cx     = width / 2;
  const topPad = height * 0.07;

  // Eyebrow
  const eyebrow = new Text({
    text: eyebrowText,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 3.5,
      fill: COL_ACCENT,
    },
  });
  eyebrow.anchor.set(0.5);
  eyebrow.position.set(cx, topPad);
  eyebrow.alpha = 0;
  root.addChild(eyebrow);

  // Title
  const titleY = topPad + 40;
  const title = new Text({
    text: titleText,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 28,
      fontWeight: '700',
      fill: COL_TITLE,
      align: 'center',
      dropShadow: { color: 0xffb43c, alpha: 0.25, blur: 20, distance: 0, angle: 0 },
    },
  });
  title.anchor.set(0.5);
  title.position.set(cx, titleY + 12);
  title.alpha = 0;
  root.addChild(title);

  // Divider — gem flanked by two lines
  const dividerY     = topPad + 80;
  const dividerHalfW = 40;
  const divider = new Graphics();
  divider.moveTo(-dividerHalfW, 0).lineTo(-10, 0).stroke({ width: 1, color: COL_DIVIDER, alpha: 0.5 });
  divider.moveTo(10, 0).lineTo(dividerHalfW, 0).stroke({ width: 1, color: COL_DIVIDER, alpha: 0.5 });
  divider.position.set(cx, dividerY);
  divider.alpha = 0;
  root.addChild(divider);

  const divGem = new Text({ text: '✦', style: { fontFamily: FONT_STACK, fontSize: 10, fill: COL_ACCENT } });
  divGem.anchor.set(0.5);
  divGem.position.set(cx, dividerY);
  divGem.alpha = 0;
  root.addChild(divGem);

  // Body text — cross-fades on slide transitions
  const bodyMaxW = Math.min(300, width - 48);
  const body = new Text({
    text: SLIDES[0],
    style: {
      fontFamily: FONT_STACK,
      fontSize: 13,
      lineHeight: 20,
      fill: COL_BODY,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: bodyMaxW,
    },
  });
  body.anchor.set(0.5);
  body.position.set(cx, topPad + 130);
  body.alpha = 0;
  root.addChild(body);

  // Progress dots
  const dotsWrap = new Container();
  dotsWrap.position.set(cx, height * 0.915);
  dotsWrap.alpha = 0;
  root.addChild(dotsWrap);

  const dotR = 3;
  const dotGap = 12;
  const dots: Graphics[] = [];
  const totalDotsW = SLIDES.length * (dotR * 2) + (SLIDES.length - 1) * dotGap;
  for (let i = 0; i < SLIDES.length; i++) {
    const dot = new Graphics().circle(0, 0, dotR).fill(COL_DOT_OFF);
    dot.x = -totalDotsW / 2 + i * (dotR * 2 + dotGap) + dotR;
    dotsWrap.addChild(dot);
    dots.push(dot);
  }
  function paintDots(activeIdx: number): void {
    for (let i = 0; i < dots.length; i++) {
      dots[i].clear().circle(0, 0, dotR).fill(i === activeIdx ? COL_DOT_ON : COL_DOT_OFF);
    }
  }
  paintDots(0);

  // Hint / CTA
  const hint = new Text({
    text: 'TAP TO CONTINUE  >',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.6,
      fill: COL_HINT,
    },
  });
  hint.anchor.set(0.5);
  hint.position.set(cx, height * 0.955);
  hint.alpha = 0;
  root.addChild(hint);

  let hintPulseTween: gsap.core.Tween | null = null;
  function showHint(isLast: boolean): void {
    hint.text = isLast ? '✦  TAP TO START  ✦' : 'TAP TO CONTINUE  >';
    hint.alpha = 1;
    hintPulseTween?.kill();
    hintPulseTween = gsap.to(hint, {
      alpha: 0.25,
      duration: isLast ? 1.2 : 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Entrance timeline ──────────────────────────────────────────────────
  const tl = gsap.timeline();
  tl.to(root,     { alpha: 1,                duration: 0.6,  ease: 'power2.out' }, 0);
  tl.to(eyebrow,  { alpha: 1,                duration: 0.35, ease: 'power2.out' }, 0.3);
  tl.to(title,    { alpha: 1, y: titleY,     duration: 0.5,  ease: 'power2.out' }, 0.45);
  tl.to(divider,  { alpha: 1,                duration: 0.35, ease: 'power2.out' }, 0.65);
  tl.to(divGem,   { alpha: 1,                duration: 0.35, ease: 'power2.out' }, 0.65);
  tl.to(body,     { alpha: 1,                duration: 0.45, ease: 'power2.out' }, 0.75);
  tl.to(dotsWrap, { alpha: 1,                duration: 0.4,  ease: 'power2.out' }, 0.9);
  tl.add(() => { showHint(false); tapLocked = false; }, (TAP_LOCK_MS + 400) / 1000);

  // ── Nana expression swap on slide advance ──────────────────────────────
  function swapNana(idx: number): void {
    if (!nanaTexMap || !nanaSprite || destroyed) return;
    const url = SLIDE_NANA[idx];
    if (!url) return;
    const tex = nanaTexMap.get(url);
    if (!tex) return;

    const halfFade = FADE_MS / 2000;
    gsap.to(nanaSprite, {
      alpha: 0,
      duration: halfFade,
      ease: 'power2.in',
      onComplete: () => {
        if (!nanaSprite || destroyed) return;
        nanaSprite.texture = tex;
        gsap.to(nanaSprite, { alpha: 1, duration: halfFade, ease: 'power2.out' });
      },
    });
  }

  // ── Tap handler ────────────────────────────────────────────────────────
  function handleTap(): void {
    if (tapLocked || destroyed) return;
    const isLast = slideIndex >= SLIDES.length - 1;

    if (isLast) {
      tapLocked = true;
      root.eventMode = 'none';
      hintPulseTween?.kill();
      gsap.to(root, {
        alpha: 0,
        duration: EXIT_MS / 1000,
        ease: 'power2.in',
        onComplete: () => { if (!destroyed) onComplete(); },
      });
      return;
    }

    tapLocked = true;
    hintPulseTween?.kill();
    hint.alpha = 0;

    gsap.to(body, {
      alpha: 0,
      duration: FADE_MS / 1000,
      ease: 'power2.in',
      onComplete: () => {
        if (destroyed) return;
        slideIndex++;
        body.text = SLIDES[slideIndex];
        paintDots(slideIndex);
        swapNana(slideIndex);
        gsap.to(body, {
          alpha: 1,
          duration: FADE_MS / 1000,
          ease: 'power2.out',
          onComplete: () => {
            if (destroyed) return;
            showHint(slideIndex === SLIDES.length - 1);
            tapLocked = false;
          },
        });
      },
    });
  }
  root.on('pointertap', handleTap);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      tl.kill();
      hintPulseTween?.kill();
      for (const t of sparkTweens) t.kill();
      gsap.killTweensOf(root);
      gsap.killTweensOf(nanaContainer);
      if (nanaSprite) gsap.killTweensOf(nanaSprite);
      gsap.killTweensOf(body);
      gsap.killTweensOf(hint);
      root.off('pointertap', handleTap);
      root.parent?.removeChild(root);
      root.destroy({ children: true });
    },
  };
}
