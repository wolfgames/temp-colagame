/* ═══════════════════════════════════════════════════════════════════════
 * Zone Interstitial (Pixi) — full-screen GPU overlay shown after each zone.
 *
 * Pixi port of ZoneInterstitial.ts. Same factory shape: takes a Container
 * + screen dimensions, returns { destroy }. Uses GSAP for entrance/exit.
 * No DOM, no CSS, no setTimeout.
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, type BLEND_MODES } from 'pixi.js';
import type { ZoneContent } from '../themes/eigenpop/zones';

const SLIDE_IN_MS   = 500;
const DISH_POP_MS   = 600;
const GLOW_DELAY_MS = 800;
const EXIT_MS       = 400;
const TAP_LOCK_MS   = 800;

const COL_BG_OVERLAY = 0x000000;
const COL_BG_OVERLAY_ALPHA = 0.82;
const COL_BADGE_BG  = 0xc4956a;
const COL_BADGE_TXT = 0xffffff;
const COL_ORDER     = 0xc4956a;
const COL_DISH_NAME = 0xfff8f0;
const COL_QUOTE     = 0xd4b896;
const COL_HINT      = 0x9e6b3a;

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const GODRAY_VFX_PATH = '/assets/vfx/effects/vfx-godray.json';

interface GodraySpawnerConfig {
  textureName?: string;
  alphaStart?: number;
  sizeStartPixels?: number;
  colorStart?: { r?: number; g?: number; b?: number };
  rotationSpeed?: number;
  rotationDirection?: 'clockwise' | 'counter-clockwise' | 'random';
  blendMode?: 'normal' | 'add' | 'multiply' | 'screen';
  pulse?: {
    enabled?: boolean;
    duration?: number;
    scaleMin?: number;
    scaleMax?: number;
    alphaMin?: number;
    alphaMax?: number;
  };
}

interface GodraySpawnerData {
  visible?: boolean;
  config?: GodraySpawnerConfig;
}

interface GodrayVfxData {
  spawners?: GodraySpawnerData[];
}

export interface ZoneInterstitialPixiDeps {
  width: number;
  height: number;
  content: ZoneContent;
  onComplete: () => void;
}

export interface ZoneInterstitialPixiController {
  destroy(): void;
}

export function createZoneInterstitialPixi(
  parent: Container,
  deps: ZoneInterstitialPixiDeps,
): ZoneInterstitialPixiController {
  const { width, height, content, onComplete } = deps;
  let destroyed = false;
  let tapLocked = true;
  const godrayTweens: gsap.core.Tween[] = [];

  const root = new Container();
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.hitArea = new Rectangle(0, 0, width, height);
  root.interactiveChildren = true;
  root.alpha = 0;
  root.y = 40;
  parent.addChild(root);

  // ── Background — semi-transparent overlay so game canvas shows through ──
  const bg = new Graphics();
  bg.rect(0, 0, width, height).fill({ color: COL_BG_OVERLAY, alpha: COL_BG_OVERLAY_ALPHA });
  root.addChild(bg);

  // ── Layout anchors ─────────────────────────────────────────────────────
  const cx = width / 2;
  const cy = height / 2;

  // ── Nana circle portrait — above ORDER COMPLETE ───────────────────────
  const NANA_R = 36;
  const nanaCircleHolder = new Container();
  nanaCircleHolder.position.set(cx, cy - 240);
  nanaCircleHolder.alpha = 0;
  root.addChild(nanaCircleHolder);

  Assets.load<Texture>('/assets/sprites/kitchen-new/nana-neutral-circle.png').then((tex) => {
    if (destroyed || !tex) return;
    const nanaSprite = new Sprite(tex);
    nanaSprite.anchor.set(0.5);
    const scale = (NANA_R * 2) / Math.max(tex.width, tex.height);
    nanaSprite.scale.set(scale);
    nanaCircleHolder.addChild(nanaSprite);
  }).catch(() => {});

  // ── Glow ring container (driven by vfx-godray config) ───────────────────
  const glowRing = new Container();
  glowRing.position.set(cx, cy - 10);
  glowRing.alpha = 0;
  glowRing.scale.set(0.6);
  root.addChild(glowRing);

  void (async () => {
    try {
      const res = await fetch(GODRAY_VFX_PATH);
      if (!res.ok) return;
      const data = (await res.json()) as GodrayVfxData;
      if (!data.spawners?.length || destroyed) return;

      let loadedSprites = 0;

      for (const spawner of data.spawners) {
        if (!spawner.visible || !spawner.config?.textureName || destroyed) continue;
        const cfg = spawner.config;

        try {
          const texture = await Assets.load<Texture>(`/assets/vfx/${cfg.textureName}`);
          if (destroyed) return;

          const sprite = new Sprite(texture);
          sprite.anchor.set(0.5);
          const targetPx = cfg.sizeStartPixels ?? 120;
          const baseScale = targetPx / Math.max(texture.width, texture.height);
          const baseAlpha = cfg.alphaStart ?? 1;
          sprite.scale.set(baseScale);
          sprite.alpha = baseAlpha;

          const r = cfg.colorStart?.r ?? 255;
          const g = cfg.colorStart?.g ?? 255;
          const b = cfg.colorStart?.b ?? 255;
          sprite.tint = (r << 16) | (g << 8) | b;
          sprite.blendMode = (cfg.blendMode ?? 'add') as BLEND_MODES;
          glowRing.addChild(sprite);
          loadedSprites++;

          const rawSpeed = Math.abs(cfg.rotationSpeed ?? 0);
          if (rawSpeed > 0) {
            const duration = 360 / rawSpeed;
            const dirSign = cfg.rotationDirection === 'counter-clockwise' ? -1 : 1;
            const tween = gsap.to(sprite, {
              rotation: `+=${dirSign * Math.PI * 2}`,
              duration,
              ease: 'none',
              repeat: -1,
            });
            godrayTweens.push(tween);
          }

          const pulse = cfg.pulse;
          if (pulse?.enabled) {
            const duration = pulse.duration ?? 1.2;
            const scaleMin = pulse.scaleMin ?? 1;
            const scaleMax = pulse.scaleMax ?? 1.08;
            const alphaMin = pulse.alphaMin ?? Math.max(baseAlpha * 0.75, 0);
            const alphaMax = pulse.alphaMax ?? baseAlpha;

            sprite.scale.set(baseScale * scaleMin);
            sprite.alpha = alphaMin;

            const scaleTween = gsap.to(sprite.scale, {
              x: baseScale * scaleMax,
              y: baseScale * scaleMax,
              duration,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });
            const alphaTween = gsap.to(sprite, {
              alpha: alphaMax,
              duration,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });
            godrayTweens.push(scaleTween, alphaTween);
          }

        } catch {
          // Ignore failed VFX layer texture; continue loading others.
        }
      }
    } catch {
      // Leave glow ring empty when VFX JSON is unavailable.
    }
  })();

  // ── Dish image (or fallback placeholder) ───────────────────────────────
  const dishHolder = new Container();
  dishHolder.position.set(cx, cy - 10);
  dishHolder.alpha = 0;
  dishHolder.scale.set(0.6);
  root.addChild(dishHolder);

  let dishSprite: Sprite | null = null;
  Assets.load<Texture>(content.dishImage).then((tex) => {
    if (destroyed || !tex) return;
    dishSprite = new Sprite(tex);
    dishSprite.anchor.set(0.5);
    const targetSize = 200;
    const scale = targetSize / Math.max(tex.width, tex.height);
    dishSprite.scale.set(scale);
    dishHolder.addChild(dishSprite);
  }).catch(() => { /* missing asset — leave dish holder empty */ });

  // ── "ORDER COMPLETE" badge ─────────────────────────────────────────────
  const badge = new Container();
  badge.alpha = 0;
  badge.scale.set(0.8);
  const badgeText = new Text({
    text: 'ORDER COMPLETE',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2.5,
      fill: COL_BADGE_TXT,
    },
  });
  badgeText.anchor.set(0.5);
  const badgePadX = 14;
  const badgePadY = 5;
  const badgeBg = new Graphics()
    .roundRect(
      -badgeText.width / 2 - badgePadX,
      -badgeText.height / 2 - badgePadY,
      badgeText.width + badgePadX * 2,
      badgeText.height + badgePadY * 2,
      20,
    )
    .fill(COL_BADGE_BG);
  badge.addChild(badgeBg, badgeText);
  badge.position.set(cx, cy - 190);
  root.addChild(badge);

  // ── Order name ─────────────────────────────────────────────────────────
  const orderEl = new Text({
    text: content.orderName,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 1.2,
      fill: COL_ORDER,
      align: 'center',
    },
  });
  orderEl.anchor.set(0.5);
  orderEl.position.set(cx, cy - 155);
  orderEl.alpha = 0;
  root.addChild(orderEl);

  // ── Dish name ──────────────────────────────────────────────────────────
  const dishNameEl = new Text({
    text: content.dishName,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 26,
      fontWeight: '700',
      fill: COL_DISH_NAME,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 48,
    },
  });
  dishNameEl.anchor.set(0.5);
  dishNameEl.position.set(cx, cy + 110);
  dishNameEl.alpha = 0;
  const dishNameTargetY = dishNameEl.y;
  dishNameEl.y += 8;
  root.addChild(dishNameEl);

  // ── Italic quote ───────────────────────────────────────────────────────
  const quoteEl = new Text({
    text: content.nanaClosingLine,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 14,
      fontStyle: 'italic',
      lineHeight: 22,
      fill: COL_QUOTE,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: Math.min(320, width - 48),
    },
  });
  quoteEl.anchor.set(0.5);
  quoteEl.position.set(cx, cy + 165);
  quoteEl.alpha = 0;
  const quoteTargetY = quoteEl.y;
  quoteEl.y += 8;
  root.addChild(quoteEl);

  // ── Tap-to-continue hint ───────────────────────────────────────────────
  const hintEl = new Text({
    text: 'TAP TO CONTINUE  >',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.8,
      fill: COL_HINT,
    },
  });
  hintEl.anchor.set(0.5);
  hintEl.position.set(cx, height - 48);
  hintEl.alpha = 0;
  root.addChild(hintEl);

  // ── Entrance — GSAP timeline ───────────────────────────────────────────
  const tl = gsap.timeline();

  tl.to(root, { alpha: 1, y: 0, duration: SLIDE_IN_MS / 1000, ease: 'power2.out' }, 0);

  tl.to(nanaCircleHolder, { alpha: 1, duration: 0.4, ease: 'back.out(1.7)' }, 0.05);

  tl.to(badge, { alpha: 1, duration: 0.3, ease: 'power2.out' }, 0.25);
  tl.to(badge.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(1.7)' }, 0.25);

  tl.to(orderEl, { alpha: 1, duration: 0.3, ease: 'power2.out' }, 0.45);

  const popAt = GLOW_DELAY_MS / 1000;
  tl.to(dishHolder, { alpha: 1, duration: DISH_POP_MS / 1000, ease: 'back.out(1.6)' }, popAt);
  tl.to(dishHolder.scale, { x: 1, y: 1, duration: DISH_POP_MS / 1000, ease: 'back.out(1.6)' }, popAt);
  tl.to(glowRing, { alpha: 1, duration: 0.4, ease: 'power2.out' }, popAt);
  tl.to(glowRing.scale, { x: 1, y: 1, duration: DISH_POP_MS / 1000, ease: 'back.out(1.4)' }, popAt);

  const namesAt = popAt + (DISH_POP_MS / 1000) - 0.1;
  tl.to(dishNameEl, { alpha: 1, y: dishNameTargetY, duration: 0.3, ease: 'power2.out' }, namesAt);
  tl.to(quoteEl, { alpha: 1, y: quoteTargetY, duration: 0.3, ease: 'power2.out' }, namesAt + 0.2);

  tl.to(hintEl, { alpha: 1, duration: 0.4, ease: 'power2.out',
    onStart: () => { tapLocked = false; } }, (TAP_LOCK_MS + GLOW_DELAY_MS) / 1000);

  // Hint fades in and out forever
  const hintPulseTween = gsap.to(hintEl, {
    alpha: 0.25,
    duration: 1.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: (TAP_LOCK_MS + GLOW_DELAY_MS) / 1000 + 0.6,
  });

  // ── Tap-to-dismiss ─────────────────────────────────────────────────────
  function handleTap(): void {
    if (tapLocked || destroyed) return;
    tapLocked = true;
    root.eventMode = 'none';

    gsap.to(root, {
      alpha: 0,
      y: -20,
      duration: EXIT_MS / 1000,
      ease: 'power2.in',
      onComplete: () => { if (!destroyed) onComplete(); },
    });
  }
  root.on('pointertap', handleTap);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      tl.kill();
      hintPulseTween.kill();
      for (const tween of godrayTweens) tween.kill();
      gsap.killTweensOf(root);
      gsap.killTweensOf(glowRing);
      gsap.killTweensOf(glowRing.scale);
      gsap.killTweensOf(dishHolder);
      gsap.killTweensOf(dishHolder.scale);
      gsap.killTweensOf(badge);
      gsap.killTweensOf(badge.scale);
      gsap.killTweensOf(nanaCircleHolder);
      root.off('pointertap', handleTap);
      root.parent?.removeChild(root);
      root.destroy({ children: true });
    },
  };
}
