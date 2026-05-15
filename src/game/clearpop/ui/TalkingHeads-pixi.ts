/* ═══════════════════════════════════════════════════════════════════════
 * Talking Heads (Pixi) — dialogue overlay above Pixi gameplay.
 *
 * Pixi port of TalkingHeads.ts. Same factory shape: takes a Container
 * + screen dimensions, returns { destroy }. Portraits as Sprites with
 * tint-based dimming (no filters). GSAP for slides + bubble fades.
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { DialogueStep, SpeakerConfig } from './TalkingHeads';

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const PORTRAIT_CONTAINER_W = 200;
const BUBBLE_PADDING = 12;
const BUBBLE_Y = 12;            // distance from bottom of screen

const COL_BUBBLE_BG    = 0xfff8f0;
const COL_BUBBLE_BORD  = 0xc4956a;
const COL_BUBBLE_TXT   = 0x2c1a0e;
const COL_LABEL        = 0xffffff;
const COL_FOOTER       = 0x9e6b3a;

// Inactive speaker tint — multiplied with sprite color. 0x4d4d4d ≈ 30% brightness.
const INACTIVE_TINT = 0x4d4d4d;
const ACTIVE_TINT   = 0xffffff;

const PORTRAIT_DEFAULTS = { width: 300, offsetX: -80, offsetY: -10 };

const ANIM = {
  SLIDE_IN_MS: 600,
  SLIDE_OUT_MS: 380,
  BUBBLE_FADE_MS: 200,
  BUBBLE_SLIDE_PX: 40,
  DIM_TRANSITION_MS: 500,
  SPEAKER_SWAP_WAIT_MS: 350,
  EXITING_CALLBACK_MS: 50,
} as const;

export interface TalkingHeadsPixiDeps {
  width: number;
  height: number;
  steps: DialogueStep[];
  speakers: Record<string, SpeakerConfig>;
  onComplete: () => void;
  onExiting?: () => void;
  lastStepLabel?: string;
  skipEnterAnimation?: boolean;
  skipExitAnimation?: boolean;
  onSlideSound?: () => void;
  /** Optional dish image URL — renders a circular badge that slides in from the left. */
  dishImage?: string;
}

export interface TalkingHeadsPixiController {
  destroy(): void;
}

interface PortraitMeta {
  key: string;
  name: string;
  image: string;
  side: 'left' | 'right';
  portraitW: number;
  portraitOffsetX: number;
  portraitOffsetY: number;
}

export function createTalkingHeadsPixi(
  parent: Container,
  deps: TalkingHeadsPixiDeps,
): TalkingHeadsPixiController {
  const { width, height, steps, speakers, onComplete, onExiting, onSlideSound } = deps;
  const lastStepLabel = deps.lastStepLabel ?? "LET'S GO  >";
  const skipEnterAnimation = deps.skipEnterAnimation ?? false;
  const skipExitAnimation  = deps.skipExitAnimation ?? false;

  let stepIndex = 0;
  let isTransitioning = false;
  let leftSlideIn = false;
  let rightSlideIn = false;
  let destroyed = false;

  function getMeta(step: DialogueStep): PortraitMeta {
    const cfg = speakers[step.speaker];
    const side = step.side ?? cfg?.side ?? 'left';
    const portrait = cfg?.portrait ?? PORTRAIT_DEFAULTS;
    return {
      key: step.speaker,
      name: step.name ?? cfg?.name ?? step.speaker,
      image: step.image ?? cfg?.image ?? '',
      side,
      portraitW: portrait.width ?? PORTRAIT_DEFAULTS.width,
      portraitOffsetX: portrait.offsetX ?? PORTRAIT_DEFAULTS.offsetX,
      portraitOffsetY: portrait.offsetY ?? PORTRAIT_DEFAULTS.offsetY,
    };
  }

  const leftBaseStep = steps.find(s => getMeta(s).side === 'left');
  const rightBaseStep = steps.find(s => getMeta(s).side === 'right');
  const leftBase  = leftBaseStep  ? getMeta(leftBaseStep)  : null;
  const rightBase = rightBaseStep ? getMeta(rightBaseStep) : null;
  const firstMeta = getMeta(steps[0]);

  // Pre-load every distinct image referenced across the dialogue
  const allImages = Array.from(new Set(steps.map(s => getMeta(s).image).filter(Boolean)));
  const texCache = new Map<string, Texture>();

  // ── Root ───────────────────────────────────────────────────────────────
  const root = new Container();
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.hitArea = new Rectangle(0, 0, width, height);
  root.interactiveChildren = true;
  parent.addChild(root);

  // ── Portrait containers ────────────────────────────────────────────────
  const leftContainer  = leftBase  ? new Container() : null;
  const leftSprite     = leftBase  ? new Sprite() : null;
  const rightContainer = rightBase ? new Container() : null;
  const rightSprite    = rightBase ? new Sprite() : null;

  // Off-screen start positions for slide
  const leftHiddenX  = -PORTRAIT_CONTAINER_W - 60;
  const leftShownX   = 0;
  const rightHiddenX = width + 60;
  const rightShownX  = width - PORTRAIT_CONTAINER_W;

  if (leftContainer && leftSprite && leftBase) {
    leftSprite.anchor.set(0, 1); // bottom-left
    leftContainer.addChild(leftSprite);
    leftContainer.y = height - BUBBLE_Y;
    leftContainer.x = leftHiddenX;
    root.addChild(leftContainer);
  }
  if (rightContainer && rightSprite && rightBase) {
    rightSprite.anchor.set(1, 1); // bottom-right
    rightContainer.addChild(rightSprite);
    rightContainer.y = height - BUBBLE_Y;
    rightContainer.x = rightHiddenX;
    root.addChild(rightContainer);
  }

  function applyPortraitTexture(side: 'left' | 'right', tex: Texture, meta: PortraitMeta): void {
    const sprite = side === 'left' ? leftSprite : rightSprite;
    if (!sprite) return;
    sprite.texture = tex;
    const scale = meta.portraitW / tex.width;
    sprite.scale.set(scale);
    if (side === 'left') {
      sprite.x = meta.portraitOffsetX;
      sprite.y = -meta.portraitOffsetY;
    } else {
      sprite.x = PORTRAIT_CONTAINER_W - meta.portraitOffsetX;
      sprite.y = -meta.portraitOffsetY;
    }
  }

  // Load every dialogue image up front so swaps are instant
  Promise.all(
    allImages.map((src) =>
      Assets.load<Texture>(src).then((tex) => { if (tex) texCache.set(src, tex); }).catch(() => {}),
    ),
  ).then(() => {
    if (destroyed) return;
    // Apply the base texture for each side now that we have it
    if (leftBase) {
      const tex = texCache.get(leftBase.image);
      if (tex) applyPortraitTexture('left', tex, leftBase);
    }
    if (rightBase) {
      const tex = texCache.get(rightBase.image);
      if (tex) applyPortraitTexture('right', tex, rightBase);
    }
    // If we already started before textures loaded, apply current step too
    const meta = getMeta(steps[stepIndex]);
    swapPortraitImage(meta);
    updatePortraitBrightness(meta.side === 'right');
  });

  // ── Bubble ─────────────────────────────────────────────────────────────
  const bubbleOuter = new Container();
  bubbleOuter.alpha = 0;
  bubbleOuter.x = BUBBLE_PADDING;
  bubbleOuter.y = height - BUBBLE_Y + ANIM.BUBBLE_SLIDE_PX;
  root.addChild(bubbleOuter);

  const labelBg = new Graphics();
  const labelEl = new Text({
    text: '',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1.6,
      fill: COL_LABEL,
    },
  });
  bubbleOuter.addChild(labelBg);
  bubbleOuter.addChild(labelEl);

  const panel = new Container();
  bubbleOuter.addChild(panel);

  const panelBg   = new Graphics();
  const messageEl = new Text({
    text: '',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 15,
      lineHeight: 22,
      fill: COL_BUBBLE_TXT,
      wordWrap: true,
      wordWrapWidth: width - BUBBLE_PADDING * 2 - 36,
    },
  });
  const footerEl = new Text({
    text: '',
    style: {
      fontFamily: FONT_STACK,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      fill: COL_FOOTER,
    },
  });
  panel.addChild(panelBg, messageEl, footerEl);

  function relayoutPanel(): void {
    const padX = 18;
    const padTop = 16;
    const padBetween = 8;
    const padBottom = 10;

    messageEl.x = padX;
    messageEl.y = padTop;

    footerEl.x = (width - BUBBLE_PADDING * 2) - padX - footerEl.width;
    footerEl.y = messageEl.y + messageEl.height + padBetween;

    const panelW = width - BUBBLE_PADDING * 2;
    const panelH = footerEl.y + footerEl.height + padBottom;

    panelBg.clear()
      .roundRect(0, 0, panelW, panelH, 10)
      .fill(COL_BUBBLE_BG)
      .roundRect(0, 0, panelW, panelH, 10)
      .stroke({ width: 2, color: COL_BUBBLE_BORD });

    // Label background pill — redrawn here so it matches the current text width
    const lblPadX = 10;
    const lblPadY = 4;
    labelBg.clear()
      .roundRect(-lblPadX, -lblPadY, labelEl.width + lblPadX * 2, labelEl.height + lblPadY * 2, 6)
      .fill(COL_BUBBLE_BORD);

    // Panel sits below the label
    panel.y = labelEl.height + lblPadY * 2 + 6;

    // Anchor whole bubble at bottom-aligned position above BUBBLE_Y
    bubbleOuter.pivot.y = panel.y + panelH;
  }

  // ── State updates ──────────────────────────────────────────────────────
  function swapPortraitImage(meta: PortraitMeta): void {
    const tex = texCache.get(meta.image);
    if (!tex) return;
    applyPortraitTexture(meta.side, tex, meta);
  }

  function updatePortraitBrightness(rightActive: boolean): void {
    if (leftSprite)  leftSprite.tint  = rightActive ? INACTIVE_TINT : ACTIVE_TINT;
    if (rightSprite) rightSprite.tint = rightActive ? ACTIVE_TINT   : INACTIVE_TINT;
  }

  function slideIn(side: 'left' | 'right'): void {
    if (side === 'left' && leftContainer) {
      gsap.to(leftContainer, { x: leftShownX, duration: ANIM.SLIDE_IN_MS / 1000, ease: 'power2.out' });
      leftSlideIn = true;
    } else if (side === 'right' && rightContainer) {
      gsap.to(rightContainer, { x: rightShownX, duration: ANIM.SLIDE_IN_MS / 1000, ease: 'power2.out' });
      rightSlideIn = true;
    }
    onSlideSound?.();
  }

  function slideOutAll(): void {
    if (leftContainer) {
      gsap.to(leftContainer, { x: leftHiddenX, duration: ANIM.SLIDE_OUT_MS / 1000, ease: 'power2.in' });
    }
    if (rightContainer) {
      gsap.to(rightContainer, { x: rightHiddenX, duration: ANIM.SLIDE_OUT_MS / 1000, ease: 'power2.in' });
    }
    leftSlideIn = false;
    rightSlideIn = false;
  }

  function showBubble(): void {
    gsap.killTweensOf(bubbleOuter);
    gsap.to(bubbleOuter, {
      alpha: 1,
      y: height - BUBBLE_Y,
      duration: ANIM.BUBBLE_FADE_MS / 1000,
      ease: 'power2.out',
    });
  }

  function hideBubble(): void {
    gsap.killTweensOf(bubbleOuter);
    gsap.to(bubbleOuter, {
      alpha: 0,
      y: height - BUBBLE_Y + ANIM.BUBBLE_SLIDE_PX,
      duration: ANIM.BUBBLE_FADE_MS / 1000,
      ease: 'power2.in',
    });
  }

  function renderStep(index: number): void {
    const step = steps[index];
    const meta = getMeta(step);
    const isLast = index >= steps.length - 1;
    labelEl.text = meta.name;
    messageEl.text = step.message;
    footerEl.text = isLast ? lastStepLabel : 'TAP TO CONTINUE  >';
    relayoutPanel();
    swapPortraitImage(meta);
    updatePortraitBrightness(meta.side === 'right');
  }

  function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      gsap.delayedCall(ms / 1000, () => { if (!destroyed) resolve(); });
    });
  }

  async function handleTap(): Promise<void> {
    if (isTransitioning || destroyed) return;
    const currentStep = steps[stepIndex];
    if (!currentStep) return;

    const isLast = stepIndex >= steps.length - 1;

    if (!isLast) {
      const nextStep = steps[stepIndex + 1];
      const nextMeta = getMeta(nextStep);
      const sameSpeaker = nextStep.speaker === currentStep.speaker;

      if (sameSpeaker) {
        stepIndex++;
        renderStep(stepIndex);
      } else {
        isTransitioning = true;
        hideBubble();
        const needsSlideIn = nextMeta.side === 'right' ? !rightSlideIn : !leftSlideIn;
        await delay(ANIM.SPEAKER_SWAP_WAIT_MS);
        if (destroyed) return;
        stepIndex++;
        renderStep(stepIndex);
        if (needsSlideIn) {
          slideIn(nextMeta.side);
          await delay(ANIM.SLIDE_IN_MS);
        } else {
          await delay(200);
        }
        if (destroyed) return;
        showBubble();
        isTransitioning = false;
      }
    } else if (skipExitAnimation) {
      isTransitioning = true;
      hideBubble();
      await delay(ANIM.SPEAKER_SWAP_WAIT_MS);
      if (destroyed) return;
      isTransitioning = false;
      onComplete();
    } else {
      isTransitioning = true;
      slideOutAll();
      await delay(120);
      if (destroyed) return;
      hideBubble();
      await delay(ANIM.EXITING_CALLBACK_MS);
      if (destroyed) return;
      onExiting?.();
      await delay(ANIM.SLIDE_OUT_MS - ANIM.EXITING_CALLBACK_MS);
      if (destroyed) return;
      isTransitioning = false;
      onComplete();
    }
  }
  root.on('pointertap', handleTap);

  // ── Dish badge (zone intro only) ───────────────────────────────────────
  // A circular food image that slides in from the left, anchored to the
  // top-right corner of the dialogue bubble area.
  const DISH_R = 46; // radius → ~92px diameter
  let dishBadge: Container | null = null;

  if (deps.dishImage) {
    dishBadge = new Container();

    const border = new Graphics()
      .circle(0, 0, DISH_R + 3)
      .fill({ color: COL_BUBBLE_BG })
      .circle(0, 0, DISH_R + 3)
      .stroke({ width: 2.5, color: COL_BUBBLE_BORD });
    dishBadge.addChild(border);

    const dishSprite = new Sprite();
    dishSprite.anchor.set(0.5);
    const dishMask = new Graphics().circle(0, 0, DISH_R).fill({ color: 0xffffff });
    dishBadge.addChild(dishMask);
    dishBadge.addChild(dishSprite);
    dishSprite.mask = dishMask;

    Assets.load<Texture>(deps.dishImage)
      .then((tex) => {
        if (destroyed || !tex) return;
        const scale = (DISH_R * 2) / Math.max(tex.width, tex.height);
        dishSprite.texture = tex;
        dishSprite.scale.set(scale);
      })
      .catch(() => {});

    // Right side, above the bubble panel so it never covers text.
    // ~200px from bottom clears even the tallest two-line bubble.
    const xFinal = width - BUBBLE_PADDING - DISH_R - 4;
    const yPos   = height - 130 - DISH_R;
    dishBadge.x  = width + DISH_R * 2 + 20;  // start just off the right edge
    dishBadge.y  = yPos;
    dishBadge.alpha = 0;
    root.addChild(dishBadge);

    gsap.delayedCall(0.35, () => {
      if (destroyed || !dishBadge) return;
      gsap.to(dishBadge, { x: xFinal, alpha: 1, duration: 0.5, ease: 'back.out(1.4)' });
    });
  }

  // ── Entrance ───────────────────────────────────────────────────────────
  renderStep(0);

  if (skipEnterAnimation) {
    if (firstMeta.side === 'left' && leftContainer) {
      leftContainer.x = leftShownX;
      leftSlideIn = true;
    } else if (firstMeta.side === 'right' && rightContainer) {
      rightContainer.x = rightShownX;
      rightSlideIn = true;
    }
    bubbleOuter.alpha = 1;
    bubbleOuter.y = height - BUBBLE_Y;
  } else {
    gsap.delayedCall(0.4, () => { if (!destroyed) slideIn(firstMeta.side); });
    gsap.delayedCall(0.65, () => { if (!destroyed) showBubble(); });
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      gsap.killTweensOf(root);
      gsap.killTweensOf(bubbleOuter);
      if (leftContainer)  gsap.killTweensOf(leftContainer);
      if (rightContainer) gsap.killTweensOf(rightContainer);
      if (dishBadge)      gsap.killTweensOf(dishBadge);
      root.off('pointertap', handleTap);
      root.parent?.removeChild(root);
      root.destroy({ children: true });
    },
  };
}
