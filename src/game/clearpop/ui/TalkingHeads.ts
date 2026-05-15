/* ═══════════════════════════════════════════════════════════════════════
 * Talking Heads — DOM dialogue overlay above Pixi gameplay.
 *
 * Adapted from artifacts/wrappers/talking-heads/screen-patterns.tsx.
 * Copy that file for reference; edit only // ADAPT: sections below.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: portrait container sizing
const PORTRAIT_CONTAINER_W = 200;  // px — narrower for single-speaker portrait layout
const PORTRAIT_CONTAINER_X = 0;   // px — flush to screen edge

// ADAPT: portrait image defaults
const PORTRAIT_DEFAULTS = {
  width: 220,       // px
  offsetX: -10,    // px
  offsetY: -10,     // px
};

// ADAPT: dialogue bubble positioning
const BUBBLE_PADDING = 12;  // px — left/right inset
const BUBBLE_Y = 12;        // px — distance from bottom

// ADAPT: bubble styling — warm, cozy, witch-kitchen palette
const BUBBLE_STYLE = {
  background: '#FFF8F0',
  border: '2px solid #C4956A',
  borderRadius: '10px',
  shadow: '0 8px 24px rgba(0,0,0,0.45)',
  labelColor: '#ffffff',
  labelShadow: '0 2px 6px rgba(0,0,0,0.9)',
  bodyColor: '#2C1A0E',
  bodyFontSize: '15px',
  footerColor: '#9E6B3A',
  footerFontSize: '12px',
  padding: '16px 18px 10px',
};

// ADAPT: inactive speaker brightness
const INACTIVE_BRIGHTNESS = 0.3;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  SLIDE_IN_MS: 600,
  SLIDE_OUT_MS: 380,
  BUBBLE_FADE_MS: 200,
  BUBBLE_SLIDE_PX: 40,
  DIM_TRANSITION_MS: 500,
  SPEAKER_SWAP_WAIT_MS: 350,
  EXITING_CALLBACK_MS: 50,
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES (exported for consumers)
 * ═══════════════════════════════════════════════════════════════════════ */

export interface PortraitConfig {
  width?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface SpeakerConfig {
  name: string;
  image: string;
  side: 'left' | 'right';
  portrait?: PortraitConfig;
}

export interface DialogueStep {
  speaker: string;
  message: string;
  image?: string;
  name?: string;
  side?: 'left' | 'right';
}

export interface TalkingHeadsDeps {
  steps: DialogueStep[];
  speakers: Record<string, SpeakerConfig>;
  onComplete: () => void;
  onExiting?: () => void;
  lastStepLabel?: string;
  skipEnterAnimation?: boolean;
  skipExitAnimation?: boolean;
  onSlideSound?: () => void;
}

export interface TalkingHeadsController {
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

export function createTalkingHeads(
  container: HTMLDivElement,
  deps: TalkingHeadsDeps,
): TalkingHeadsController {
  const { steps, speakers, onComplete, onExiting, onSlideSound } = deps;
  const lastStepLabel = deps.lastStepLabel ?? "LET'S GO \u203A";
  const skipEnterAnimation = deps.skipEnterAnimation ?? false;
  const skipExitAnimation = deps.skipExitAnimation ?? false;

  let stepIndex = 0;
  let isTransitioning = false;
  let leftSlideIn = false;
  let rightSlideIn = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  function getMeta(step: DialogueStep) {
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
  const leftBase = leftBaseStep ? getMeta(leftBaseStep) : null;
  const rightBase = rightBaseStep ? getMeta(rightBaseStep) : null;
  const firstMeta = getMeta(steps[0]);

  // BUILD DOM

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0; z-index: 50;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    overflow: hidden;
  `;

  let leftContainer: HTMLDivElement | null = null;
  let leftImg: HTMLImageElement | null = null;

  if (leftBase) {
    leftContainer = document.createElement('div');
    leftContainer.style.cssText = `
      position: absolute;
      bottom: ${BUBBLE_Y}px;
      left: ${PORTRAIT_CONTAINER_X}px;
      width: ${PORTRAIT_CONTAINER_W}px;
      height: 0; overflow: visible;
      pointer-events: none;
      transition: transform ${ANIM.SLIDE_IN_MS}ms ease-out;
      transform: translateX(calc(-100% - 60px));
    `;
    leftImg = document.createElement('img');
    leftImg.draggable = false;
    leftImg.alt = leftBase.name;
    leftImg.src = leftBase.image;
    leftImg.style.cssText = `
      position: absolute;
      bottom: ${leftBase.portraitOffsetY}px;
      left: ${leftBase.portraitOffsetX}px;
      width: ${leftBase.portraitW}px;
      z-index: 0;
      transition: filter ${ANIM.DIM_TRANSITION_MS}ms ease-out;
    `;
    leftContainer.appendChild(leftImg);
    wrapper.appendChild(leftContainer);
  }

  let rightContainer: HTMLDivElement | null = null;
  let rightImg: HTMLImageElement | null = null;

  if (rightBase) {
    rightContainer = document.createElement('div');
    rightContainer.style.cssText = `
      position: absolute;
      bottom: ${BUBBLE_Y}px;
      right: ${PORTRAIT_CONTAINER_X}px;
      width: ${PORTRAIT_CONTAINER_W}px;
      height: 0; overflow: visible;
      pointer-events: none;
      transition: transform ${ANIM.SLIDE_IN_MS}ms ease-out;
      transform: translateX(calc(100% + 60px));
    `;
    rightImg = document.createElement('img');
    rightImg.draggable = false;
    rightImg.alt = rightBase.name;
    rightImg.src = rightBase.image;
    rightImg.style.cssText = `
      position: absolute;
      bottom: ${rightBase.portraitOffsetY}px;
      right: ${rightBase.portraitOffsetX}px;
      width: ${rightBase.portraitW}px;
      z-index: 0;
      transition: filter ${ANIM.DIM_TRANSITION_MS}ms ease-out;
    `;
    rightContainer.appendChild(rightImg);
    wrapper.appendChild(rightContainer);
  }

  const bubbleOuter = document.createElement('div');
  bubbleOuter.style.cssText = `
    position: absolute;
    bottom: ${BUBBLE_Y}px;
    left: ${BUBBLE_PADDING}px;
    right: ${BUBBLE_PADDING}px;
    z-index: 1;
    pointer-events: none;
    transition: opacity ${ANIM.BUBBLE_FADE_MS}ms ease-out,
                transform ${ANIM.BUBBLE_FADE_MS}ms ease-out;
    opacity: 0;
    transform: translateY(${ANIM.BUBBLE_SLIDE_PX}px);
  `;

  const labelEl = document.createElement('div');
  labelEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.6px;
    color: ${BUBBLE_STYLE.labelColor};
    text-shadow: ${BUBBLE_STYLE.labelShadow};
    margin-bottom: 4px; padding-left: 2px;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background: ${BUBBLE_STYLE.background};
    border: ${BUBBLE_STYLE.border};
    border-radius: ${BUBBLE_STYLE.borderRadius};
    box-shadow: ${BUBBLE_STYLE.shadow};
    padding: ${BUBBLE_STYLE.padding};
    display: flex; flex-direction: column; gap: 8px;
  `;

  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: ${BUBBLE_STYLE.bodyFontSize};
    line-height: 22px;
    color: ${BUBBLE_STYLE.bodyColor};
  `;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: ${BUBBLE_STYLE.footerFontSize};
    font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.2px;
    color: ${BUBBLE_STYLE.footerColor};
    text-align: right; padding-top: 8px;
  `;

  panel.append(messageEl, footerEl);
  bubbleOuter.append(labelEl, panel);
  wrapper.appendChild(bubbleOuter);
  container.appendChild(wrapper);

  // STATE UPDATES

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      timers.push(setTimeout(resolve, ms));
    });
  }

  function updatePortraitBrightness(isRight: boolean): void {
    if (leftImg) leftImg.style.filter = isRight ? `brightness(${INACTIVE_BRIGHTNESS})` : 'brightness(1)';
    if (rightImg) rightImg.style.filter = !isRight ? `brightness(${INACTIVE_BRIGHTNESS})` : 'brightness(1)';
  }

  function updatePortraitImages(meta: ReturnType<typeof getMeta>): void {
    if (meta.side === 'left' && leftImg) leftImg.src = meta.image;
    else if (meta.side === 'right' && rightImg) rightImg.src = meta.image;
  }

  function slideIn(side: 'left' | 'right'): void {
    if (side === 'left' && leftContainer) {
      leftContainer.style.transform = 'translateX(0)';
      leftSlideIn = true;
    } else if (side === 'right' && rightContainer) {
      rightContainer.style.transform = 'translateX(0)';
      rightSlideIn = true;
    }
    onSlideSound?.();
  }

  function slideOutAll(): void {
    if (leftContainer) {
      leftContainer.style.transitionDuration = `${ANIM.SLIDE_OUT_MS}ms`;
      leftContainer.style.transform = 'translateX(calc(-100% - 60px))';
    }
    if (rightContainer) {
      rightContainer.style.transitionDuration = `${ANIM.SLIDE_OUT_MS}ms`;
      rightContainer.style.transform = 'translateX(calc(100% + 60px))';
    }
    leftSlideIn = false;
    rightSlideIn = false;
  }

  function showBubble(): void {
    bubbleOuter.style.opacity = '1';
    bubbleOuter.style.transform = 'translateY(0)';
  }

  function hideBubble(): void {
    bubbleOuter.style.opacity = '0';
    bubbleOuter.style.transform = `translateY(${ANIM.BUBBLE_SLIDE_PX}px)`;
  }

  function renderStep(index: number): void {
    const step = steps[index];
    const meta = getMeta(step);
    const isLast = index >= steps.length - 1;
    labelEl.textContent = meta.name;
    messageEl.textContent = step.message;
    footerEl.textContent = isLast ? lastStepLabel : 'TAP TO CONTINUE \u203A';
    updatePortraitImages(meta);
    updatePortraitBrightness(meta.side === 'right');
  }

  // TAP HANDLER (LOCKED)

  async function handleTap(): Promise<void> {
    if (isTransitioning) return;
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
        stepIndex++;
        renderStep(stepIndex);
        if (needsSlideIn) {
          slideIn(nextMeta.side);
          await delay(ANIM.SLIDE_IN_MS);
        } else {
          await delay(200);
        }
        showBubble();
        isTransitioning = false;
      }
    } else if (skipExitAnimation) {
      isTransitioning = true;
      hideBubble();
      await delay(ANIM.SPEAKER_SWAP_WAIT_MS);
      isTransitioning = false;
      onComplete();
    } else {
      isTransitioning = true;
      slideOutAll();
      await delay(120);
      hideBubble();
      await delay(ANIM.EXITING_CALLBACK_MS);
      onExiting?.();
      await delay(ANIM.SLIDE_OUT_MS - ANIM.EXITING_CALLBACK_MS);
      isTransitioning = false;
      onComplete();
    }
  }

  wrapper.addEventListener('click', handleTap);

  // ENTRANCE (LOCKED)

  renderStep(0);

  if (skipEnterAnimation) {
    if (firstMeta.side === 'left') slideIn('left');
    else slideIn('right');
    showBubble();
  } else {
    timers.push(setTimeout(() => slideIn(firstMeta.side), 400));
    timers.push(setTimeout(() => showBubble(), 650));
  }

  return {
    destroy() {
      timers.forEach(t => clearTimeout(t));
      wrapper.removeEventListener('click', handleTap);
      wrapper.remove();
    },
  };
}
