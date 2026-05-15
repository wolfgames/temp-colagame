/* ═══════════════════════════════════════════════════════════════════════
 * Nana Rose Interstitial (Pixi) — post-level win reward overlay.
 *
 * Pixi port of Interstitial.ts. Same factory shape: takes a Container
 * + screen dimensions, returns { destroy }. GSAP for entrance/exit.
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Dish image — same per-zone mapping as the DOM version. Paths resolved at
// runtime; missing files fall through to a placeholder ring.
const ZONE_DISHES: Record<number, string> = {
  1:  '/assets/sprites/cozy-kitchen/dishes/dish-honey-cake.png',
  2:  '/assets/sprites/cozy-kitchen/dishes/dish-celebration-tart.png',
  3:  '/assets/sprites/cozy-kitchen/dishes/dish-marshmallow-cocoa.png',
  4:  '/assets/sprites/cozy-kitchen/dishes/dish-teaching-cookies.png',
  5:  '/assets/sprites/cozy-kitchen/dishes/dish-rose-macarons.png',
  6:  '/assets/sprites/cozy-kitchen/dishes/dish-pumpkin-loaf.png',
  7:  '/assets/sprites/cozy-kitchen/dishes/dish-wedding-cake.png',
  8:  '/assets/sprites/cozy-kitchen/dishes/dish-jam-roll.png',
  9:  '/assets/sprites/cozy-kitchen/dishes/dish-truce-shortbread.png',
  10: '/assets/sprites/cozy-kitchen/dishes/dish-charm-cake.png',
};

const ZONE_DISH_NAMES: Record<number, string> = {
  1:  'Honey Cake',
  2:  'Celebration Tart',
  3:  'Toasted Marshmallow Cocoa',
  4:  'Teaching Cookies',
  5:  'Rose Petal Macarons',
  6:  'Spiced Pumpkin Loaf',
  7:  'Seven-Layer Wedding Cake',
  8:  "Grandmother's Jam Roll",
  9:  'Truce Shortbread',
  10: 'The Original Charm Cake',
};

const ZONE_REACTIONS: Record<number, string> = {
  1:  "There it is. Not bad for a Monday morning.",
  2:  "Mrs. Fenn is going to love this. Don't tell her how much trouble it was.",
  3:  "Perfect for a rainy day. The regulars won't know what hit them.",
  4:  "The student's first lesson: the pantry can be reasoned with.",
  5:  "Whoever ordered this... I hope it means what I think it means.",
  6:  "Every year. Every year I say it won't be this hard. Every year.",
  7:  "Seven layers. Every one of them earned. This is the one.",
  8:  "I hope it tastes like what he remembers. That's all I wanted.",
  9:  "There. Perfect. And they'll never know why.",
  10: "Thirty years. And still, every morning, a little magic.",
};

const NANA_PORTRAIT = '/assets/sprites/cozy-kitchen/nana/nana-pleased.png';

const COL_BG          = 0x140a05;
const COL_NAME        = 0xfff8f0;
const COL_BUBBLE_BG   = 0xfff8f0;
const COL_BUBBLE_BORD = 0xc4956a;
const COL_BUBBLE_TEXT = 0x2c1a0e;
const COL_HINT        = 0x9e6b3a;
const COL_PORTRAIT_BG = 0x3d2b1f;

export interface InterstitialPixiDeps {
  width: number;
  height: number;
  zone: number;
  onComplete: () => void;
}

export interface InterstitialPixiController {
  destroy(): void;
}

export function createInterstitialPixi(
  parent: Container,
  deps: InterstitialPixiDeps,
): InterstitialPixiController {
  const { width, height, zone, onComplete } = deps;

  const dishSrc  = ZONE_DISHES[zone] ?? ZONE_DISHES[1]!;
  const dishName = ZONE_DISH_NAMES[zone] ?? 'Mystery Dish';
  const reaction = ZONE_REACTIONS[zone] ?? 'Well. That happened.';

  let destroyed = false;
  let dismissed = false;

  // ── Root + dim background (root catches taps) ─────────────────────────
  const root = new Container();
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.hitArea = new Rectangle(0, 0, width, height);
  root.interactiveChildren = true;
  root.alpha = 0;
  parent.addChild(root);

  const bg = new Graphics().rect(0, 0, width, height).fill({ color: COL_BG, alpha: 0.92 });
  root.addChild(bg);

  const cx = width / 2;
  const cy = height / 2;

  // ── Dish ───────────────────────────────────────────────────────────────
  const dishMax = Math.min(280, width * 0.7);
  const dishHolder = new Container();
  dishHolder.position.set(cx, cy - 110);
  dishHolder.scale.set(0.85);
  root.addChild(dishHolder);

  // Placeholder while the dish texture loads (or if missing)
  const dishPlaceholder = new Graphics()
    .roundRect(-dishMax / 2, -dishMax / 2, dishMax, dishMax, 16)
    .fill({ color: COL_PORTRAIT_BG, alpha: 0.6 })
    .roundRect(-dishMax / 2, -dishMax / 2, dishMax, dishMax, 16)
    .stroke({ width: 2, color: COL_BUBBLE_BORD, alpha: 0.6 });
  dishHolder.addChild(dishPlaceholder);

  Assets.load<Texture>(dishSrc).then((tex) => {
    if (destroyed || !tex) return;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    const scale = dishMax / Math.max(tex.width, tex.height);
    sprite.scale.set(scale);
    dishHolder.addChild(sprite);
  }).catch(() => { /* placeholder stays */ });

  // ── Dish name ──────────────────────────────────────────────────────────
  const nameEl = new Text({
    text: dishName,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.5,
      fill: COL_NAME,
      align: 'center',
      dropShadow: {
        color: 0x000000,
        alpha: 0.8,
        blur: 6,
        distance: 2,
        angle: Math.PI / 2,
      },
      wordWrap: true,
      wordWrapWidth: width - 48,
    },
  });
  nameEl.anchor.set(0.5);
  nameEl.position.set(cx, cy + 70);
  root.addChild(nameEl);

  // ── Nana portrait + speech bubble row ──────────────────────────────────
  const row = new Container();
  row.position.set(cx, cy + 150);
  root.addChild(row);

  const portraitSize = 72;
  const portraitGap  = 12;
  const bubbleMaxW   = Math.min(248, width - 48 - portraitSize - portraitGap);
  const rowHalfW     = (portraitSize + portraitGap + bubbleMaxW) / 2;

  // Portrait — round mask, brown border, fallback bg
  const portraitX = -rowHalfW + portraitSize / 2;

  const portraitBg = new Graphics()
    .circle(portraitX, 0, portraitSize / 2).fill(COL_PORTRAIT_BG)
    .circle(portraitX, 0, portraitSize / 2).stroke({ width: 2, color: COL_BUBBLE_BORD });
  row.addChild(portraitBg);

  Assets.load<Texture>(NANA_PORTRAIT).then((tex) => {
    if (destroyed || !tex) return;
    const portrait = new Sprite(tex);
    // Anchor: face sits at 5/11 down the source image; this keeps it centered.
    portrait.anchor.set(0.5, 5 / 11);
    portrait.position.set(portraitX, 0);
    // Zoom 2x — overflow gets cropped by the circular mask.
    const pscale = (portraitSize / Math.max(tex.width, tex.height)) * 2;
    portrait.scale.set(pscale);
    // circular mask
    const mask = new Graphics().circle(portraitX, 0, portraitSize / 2).fill(0xffffff);
    row.addChild(mask);
    portrait.mask = mask;
    row.addChild(portrait);
    // re-stroke on top so the border sits above the masked sprite
    const stroke = new Graphics().circle(portraitX, 0, portraitSize / 2)
      .stroke({ width: 2, color: COL_BUBBLE_BORD });
    row.addChild(stroke);
  }).catch(() => { /* keep placeholder bg */ });

  // Speech bubble — rounded panel + tail
  const bubbleX = -rowHalfW + portraitSize + portraitGap;

  const bubbleText = new Text({
    text: reaction,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 14,
      lineHeight: 20,
      fill: COL_BUBBLE_TEXT,
      wordWrap: true,
      wordWrapWidth: bubbleMaxW - 28, // padding inset
    },
  });

  const bubblePadX = 14;
  const bubblePadY = 12;
  const bubbleW    = bubbleMaxW;
  const bubbleH    = bubbleText.height + bubblePadY * 2;
  const bubbleY    = -bubbleH / 2;

  // Tail (filled triangle pointing toward portrait — drawn first so border overlays)
  const tail = new Graphics()
    .poly([
      bubbleX,        bubbleY + bubbleH - 8,
      bubbleX - 10,   bubbleY + bubbleH - 14,
      bubbleX,        bubbleY + bubbleH - 20,
    ])
    .fill(COL_BUBBLE_BG)
    .poly([
      bubbleX,        bubbleY + bubbleH - 8,
      bubbleX - 10,   bubbleY + bubbleH - 14,
      bubbleX,        bubbleY + bubbleH - 20,
    ])
    .stroke({ width: 2, color: COL_BUBBLE_BORD });
  row.addChild(tail);

  const bubble = new Graphics()
    .roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10)
    .fill(COL_BUBBLE_BG)
    .roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 10)
    .stroke({ width: 2, color: COL_BUBBLE_BORD });
  row.addChild(bubble);

  bubbleText.position.set(bubbleX + bubblePadX, bubbleY + bubblePadY);
  row.addChild(bubbleText);

  // ── Hint ───────────────────────────────────────────────────────────────
  const hintEl = new Text({
    text: 'TAP TO CONTINUE  >',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      fill: COL_HINT,
    },
  });
  hintEl.anchor.set(0.5);
  hintEl.position.set(cx, cy + 220);
  hintEl.alpha = 0;
  root.addChild(hintEl);

  // ── Entrance — single GSAP timeline ────────────────────────────────────
  const tl = gsap.timeline();
  tl.to(root, { alpha: 1, duration: 0.35, ease: 'power2.out' }, 0);
  tl.to(dishHolder.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(1.7)' }, 0.05);
  tl.to(hintEl, { alpha: 1, duration: 0.6, ease: 'power2.out' }, 0.9);

  // Hint fades in and out forever
  const hintPulseTween = gsap.to(hintEl, {
    alpha: 0.25,
    duration: 1.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 1.5,
  });

  // ── Tap to dismiss ─────────────────────────────────────────────────────
  function handleTap(): void {
    if (dismissed || destroyed) return;
    dismissed = true;
    root.eventMode = 'none';

    gsap.to(root, {
      alpha: 0,
      duration: 0.25,
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
      gsap.killTweensOf(root);
      gsap.killTweensOf(dishHolder);
      gsap.killTweensOf(dishHolder.scale);
      gsap.killTweensOf(hintEl);
      root.off('pointertap', handleTap);
      root.parent?.removeChild(root);
      root.destroy({ children: true });
    },
  };
}
