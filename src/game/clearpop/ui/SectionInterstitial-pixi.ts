/* ═══════════════════════════════════════════════════════════════════════
 * Section Interstitial (Pixi) — shown at the start of a new recipe section.
 *
 * Fires when the blocker mix changes between levels. Forward-looking tone:
 * Nana announces what she's making next based on the incoming blockers.
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { ObstacleType } from '../state/types';
import type { RecipeSection } from '../contracts/theme';

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const COL_BG          = 0x140a05;
const COL_NAME        = 0xfff8f0;
const COL_BUBBLE_BG   = 0xfff8f0;
const COL_BUBBLE_BORD = 0xc4956a;
const COL_BUBBLE_TEXT = 0x2c1a0e;
const COL_HINT        = 0x9e6b3a;
const COL_PORTRAIT_BG = 0x3d2b1f;
const COL_LABEL       = 0xc4956a;

export interface SectionInterstitialPixiDeps {
  width: number;
  height: number;
  recipe: RecipeSection;
  blockers: ObstacleType[];
  /** Player-visible blocker names keyed by obstacle type. */
  blockerDisplayNames: Record<ObstacleType, string>;
  /** Companion portrait shown in the speech bubble. */
  companionPortrait: string;
  onComplete: () => void;
}

export interface SectionInterstitialPixiController {
  destroy(): void;
}

export function createSectionInterstitialPixi(
  parent: Container,
  deps: SectionInterstitialPixiDeps,
): SectionInterstitialPixiController {
  const { width, height, recipe, blockers, blockerDisplayNames, companionPortrait, onComplete } = deps;
  const NANA_PORTRAIT = companionPortrait;

  const sortedBlockers = [...blockers].sort();
  const ingredientNames = sortedBlockers.map(b => blockerDisplayNames[b] ?? b);
  const ingredientLine = ingredientNames.length <= 1
    ? `I'll need to clear the ${ingredientNames[0]}.`
    : `I'll need to clear the ${ingredientNames.slice(0, -1).join(', ')} and ${ingredientNames[ingredientNames.length - 1]}.`;

  let destroyed = false;
  let dismissed = false;

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

  // ── "NEXT RECIPE" label ────────────────────────────────────────────────
  const labelEl = new Text({
    text: 'NEXT RECIPE',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2.5,
      fill: COL_LABEL,
    },
  });
  labelEl.anchor.set(0.5);
  labelEl.position.set(cx, cy - 210);
  labelEl.alpha = 0;
  root.addChild(labelEl);

  // ── Dish image ─────────────────────────────────────────────────────────
  const dishMax = Math.min(200, width * 0.5);
  const dishHolder = new Container();
  dishHolder.position.set(cx, cy - 100);
  dishHolder.scale.set(0.85);
  root.addChild(dishHolder);

  const dishPlaceholder = new Graphics()
    .roundRect(-dishMax / 2, -dishMax / 2, dishMax, dishMax, 16)
    .fill({ color: COL_PORTRAIT_BG, alpha: 0.6 })
    .roundRect(-dishMax / 2, -dishMax / 2, dishMax, dishMax, 16)
    .stroke({ width: 2, color: COL_BUBBLE_BORD, alpha: 0.6 });
  dishHolder.addChild(dishPlaceholder);

  Assets.load<Texture>(recipe.dishImage).then((tex) => {
    if (destroyed || !tex) return;
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    const scale = dishMax / Math.max(tex.width, tex.height);
    sprite.scale.set(scale);
    dishHolder.addChild(sprite);
  }).catch(() => { /* placeholder stays */ });

  // ── Dish name ──────────────────────────────────────────────────────────
  const nameEl = new Text({
    text: recipe.dishName,
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
  nameEl.position.set(cx, cy + 30);
  root.addChild(nameEl);

  // ── Ingredient line ────────────────────────────────────────────────────
  const ingredientEl = new Text({
    text: ingredientLine,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 13,
      fontStyle: 'italic',
      fill: COL_LABEL,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: width - 64,
    },
  });
  ingredientEl.anchor.set(0.5);
  ingredientEl.position.set(cx, cy + 65);
  root.addChild(ingredientEl);

  // ── Nana portrait + speech bubble ─────────────────────────────────────
  const row = new Container();
  row.position.set(cx, cy + 155);
  root.addChild(row);

  const portraitSize = 72;
  const portraitGap  = 12;
  const bubbleMaxW   = Math.min(248, width - 48 - portraitSize - portraitGap);
  const rowHalfW     = (portraitSize + portraitGap + bubbleMaxW) / 2;
  const portraitX    = -rowHalfW + portraitSize / 2;

  Assets.load<Texture>(NANA_PORTRAIT).then((tex) => {
    if (destroyed || !tex) return;
    const portrait = new Sprite(tex);
    portrait.anchor.set(0.5, 1);
    portrait.position.set(portraitX, portraitSize * 1.1);
    const pscale = (portraitSize / Math.max(tex.width, tex.height)) * 1.8;
    portrait.scale.set(pscale);
    row.addChild(portrait);
  }).catch(() => { /* no portrait — layout still works */ });

  const bubbleX = -rowHalfW + portraitSize + portraitGap;

  const bubbleText = new Text({
    text: recipe.nanaOpeningLine,
    style: {
      fontFamily: FONT_STACK,
      fontSize: 14,
      lineHeight: 20,
      fill: COL_BUBBLE_TEXT,
      wordWrap: true,
      wordWrapWidth: bubbleMaxW - 28,
    },
  });

  const bubblePadX = 14;
  const bubblePadY = 12;
  const bubbleW    = bubbleMaxW;
  const bubbleH    = bubbleText.height + bubblePadY * 2;
  const bubbleY    = -bubbleH / 2;

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

  // ── Tap hint ───────────────────────────────────────────────────────────
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
  hintEl.position.set(cx, cy + 230);
  hintEl.alpha = 0;
  root.addChild(hintEl);

  // ── Entrance timeline ──────────────────────────────────────────────────
  const tl = gsap.timeline();
  tl.to(root, { alpha: 1, duration: 0.35, ease: 'power2.out' }, 0);
  tl.to(labelEl, { alpha: 1, duration: 0.3, ease: 'power2.out' }, 0.1);
  tl.to(dishHolder.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(1.7)' }, 0.05);
  tl.to(hintEl, { alpha: 1, duration: 0.6, ease: 'power2.out' }, 0.9);

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
      gsap.killTweensOf(labelEl);
      root.off('pointertap', handleTap);
      root.parent?.removeChild(root);
      root.destroy({ children: true });
    },
  };
}
