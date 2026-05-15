/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Talking Heads
 *
 * Character dialogue overlay above gameplay. Two portrait slots (left/right)
 * with a dialogue bubble at the bottom. Tap anywhere to advance.
 *
 * Derived from clue-hunter-client-lo's IntroDialogue component.
 * Converted to framework-agnostic imperative DOM controller.
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: portrait container sizing
const PORTRAIT_CONTAINER_W = 373;  // px — width of the portrait slide area
const PORTRAIT_CONTAINER_X = 5;    // px — inset from screen edge

// ADAPT: portrait image defaults (used when speaker config omits portrait)
const PORTRAIT_DEFAULTS = {
  width: 400,       // px — rendered image width
  offsetX: -110,    // px — horizontal nudge (negative = extends past container)
  offsetY: -10,     // px — vertical nudge from bottom
};

// ADAPT: dialogue bubble positioning
const BUBBLE_PADDING = 8;  // px — left/right inset
const BUBBLE_Y = 6;        // px — distance from bottom

// ADAPT: bubble styling
const BUBBLE_STYLE = {
  background: '#ffffff',
  border: '1px solid #AA9B99',
  borderRadius: '6px',
  shadow: '0 10px 10px rgba(0,0,0,0.50)',
  labelColor: '#ffffff',          // speaker name (above bubble)
  labelShadow: '0 2px 4px rgba(0,0,0,0.8)',
  bodyColor: '#010206',           // message text
  bodyFontSize: '14px',
  footerColor: '#4E767F',         // "TAP TO CONTINUE"
  footerFontSize: '12px',
  padding: '20px 20px 10px',
};

// ADAPT: inactive speaker brightness (0 = black, 1 = full)
const INACTIVE_BRIGHTNESS = 0.3;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  SLIDE_IN_MS: 600,            // portrait entrance
  SLIDE_OUT_MS: 1800,          // portrait exit (both characters leave)
  BUBBLE_FADE_MS: 300,         // bubble opacity + translate
  BUBBLE_SLIDE_PX: 40,        // vertical distance bubble travels
  DIM_TRANSITION_MS: 500,     // speaker brightness change
  SPEAKER_SWAP_WAIT_MS: 350,  // pause between bubble-out and next action
  EXITING_CALLBACK_MS: 400,   // delay before onExiting fires during exit
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface PortraitConfig {
  width?: number;      // rendered image width (px)
  offsetX?: number;    // horizontal offset from container edge
  offsetY?: number;    // vertical offset from bottom
}

interface SpeakerConfig {
  name: string;                  // ADAPT: display name (e.g. "DET. FUENTES")
  image: string;                 // ADAPT: portrait image path
  side: 'left' | 'right';       // ADAPT: which side of screen
  portrait?: PortraitConfig;     // ADAPT: fine-tune positioning
}

interface DialogueStep {
  speaker: string;               // key into speakers config
  message: string;               // dialogue text
  image?: string;                // override portrait image for this step
  name?: string;                 // override display name for this step
  side?: 'left' | 'right';      // override side for this step
}

interface TalkingHeadsDeps {
  steps: DialogueStep[];
  speakers: Record<string, SpeakerConfig>;
  onComplete: () => void;
  onExiting?: () => void;                    // fires partway through exit animation
  lastStepLabel?: string;                    // ADAPT: footer on final step (default: "LET'S GO >")
  skipEnterAnimation?: boolean;              // start with portraits already visible
  skipExitAnimation?: boolean;               // skip slide-out, quick fade
  onSlideSound?: () => void;                 // ADAPT: sound callback for portrait sliding
}

interface TalkingHeadsController {
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER
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
  let bubbleVisible = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  // ── Resolve speaker metadata for a step ──
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

  // ── Find base speakers for each side ──
  const leftBaseStep = steps.find(s => getMeta(s).side === 'left');
  const rightBaseStep = steps.find(s => getMeta(s).side === 'right');
  const leftBase = leftBaseStep ? getMeta(leftBaseStep) : null;
  const rightBase = rightBaseStep ? getMeta(rightBaseStep) : null;
  const firstMeta = getMeta(steps[0]);

  // ═══════════════════════════════════════════════════════════════════
  // BUILD DOM
  // ═══════════════════════════════════════════════════════════════════

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0; z-index: 50;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    overflow: hidden;
  `;

  // ── Left portrait container ──
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

  // ── Right portrait container ──
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

  // ── Dialogue bubble ──
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

  // Speaker name label (above bubble)
  const labelEl = document.createElement('div');
  labelEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 16px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.6px;
    color: ${BUBBLE_STYLE.labelColor};
    text-shadow: ${BUBBLE_STYLE.labelShadow};
    margin-bottom: 6px; padding-left: 2px;
  `;

  // Bubble panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: ${BUBBLE_STYLE.background};
    border: ${BUBBLE_STYLE.border};
    border-radius: ${BUBBLE_STYLE.borderRadius};
    box-shadow: ${BUBBLE_STYLE.shadow};
    padding: ${BUBBLE_STYLE.padding};
    display: flex; flex-direction: column; gap: 10px;
  `;

  // Message text
  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: ${BUBBLE_STYLE.bodyFontSize};
    line-height: 20px;
    color: ${BUBBLE_STYLE.bodyColor};
  `;

  // Footer ("TAP TO CONTINUE")
  const footerEl = document.createElement('div');
  footerEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: ${BUBBLE_STYLE.footerFontSize};
    font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.2px;
    color: ${BUBBLE_STYLE.footerColor};
    text-align: right; padding-top: 10px;
  `;

  panel.append(messageEl, footerEl);
  bubbleOuter.append(labelEl, panel);
  wrapper.appendChild(bubbleOuter);

  container.appendChild(wrapper);

  // ═══════════════════════════════════════════════════════════════════
  // STATE UPDATES
  // ═══════════════════════════════════════════════════════════════════

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
    // Update the active side's image if this step overrides it
    if (meta.side === 'left' && leftImg) {
      leftImg.src = meta.image;
    } else if (meta.side === 'right' && rightImg) {
      rightImg.src = meta.image;
    }
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
    bubbleVisible = true;
  }

  function hideBubble(): void {
    bubbleOuter.style.opacity = '0';
    bubbleOuter.style.transform = `translateY(${ANIM.BUBBLE_SLIDE_PX}px)`;
    bubbleVisible = false;
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

  // ═══════════════════════════════════════════════════════════════════
  // TAP HANDLER (LOCKED flow)
  // ═══════════════════════════════════════════════════════════════════

  async function handleTap(): Promise<void> {
    if (isTransitioning) return;
    const currentStep = steps[stepIndex];
    if (!currentStep) return;

    const isLast = stepIndex >= steps.length - 1;

    if (!isLast) {
      // ── Advance to next step ──
      const nextStep = steps[stepIndex + 1];
      const nextMeta = getMeta(nextStep);
      const sameSpeaker = nextStep.speaker === currentStep.speaker;

      if (sameSpeaker) {
        // Same speaker: instant text swap
        stepIndex++;
        renderStep(stepIndex);
      } else {
        // Different speaker: full transition
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
      // ── Quick exit ──
      isTransitioning = true;
      hideBubble();
      await delay(ANIM.SPEAKER_SWAP_WAIT_MS);
      isTransitioning = false;
      onComplete();
    } else {
      // ── Full exit animation (LOCKED) ──
      isTransitioning = true;
      hideBubble();
      await delay(ANIM.SPEAKER_SWAP_WAIT_MS);
      slideOutAll();
      await delay(ANIM.EXITING_CALLBACK_MS);
      onExiting?.();
      await delay(ANIM.SLIDE_OUT_MS - ANIM.EXITING_CALLBACK_MS);
      isTransitioning = false;
      onComplete();
    }
  }

  wrapper.addEventListener('click', handleTap);

  // ═══════════════════════════════════════════════════════════════════
  // ENTRANCE (LOCKED timing)
  // ═══════════════════════════════════════════════════════════════════

  renderStep(0);

  if (skipEnterAnimation) {
    // Start with everything visible
    if (firstMeta.side === 'left') slideIn('left');
    else slideIn('right');
    showBubble();
  } else {
    // Animated entrance
    const t1 = setTimeout(() => {
      slideIn(firstMeta.side);
    }, 400);
    timers.push(t1);

    const t2 = setTimeout(() => {
      showBubble();
    }, 650);
    timers.push(t2);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DESTROY
  // ═══════════════════════════════════════════════════════════════════

  return {
    destroy() {
      timers.forEach(t => clearTimeout(t));
      wrapper.removeEventListener('click', handleTap);
      wrapper.remove();
    },
  };
}
