/* ═══════════════════════════════════════════════════════════════════════
 * Nana Rose Interstitial — post-level win reward screen.
 *
 * Full-screen DOM overlay: Nana's portrait + dish image + reaction line.
 * Tap anywhere to dismiss. Calls onComplete when dismissed.
 * ═══════════════════════════════════════════════════════════════════════ */

export interface InterstitialDeps {
  zone: number;
  onComplete: () => void;
}

export interface InterstitialController {
  destroy(): void;
}

// Zone dish images — swap with real assets when generated.
const ZONE_DISHES: Record<number, string> = {
  1:  '/assets/interstitials/zone-1-dish.png',
  2:  '/assets/interstitials/zone-2-dish.png',
  3:  '/assets/interstitials/zone-3-dish.png',
  4:  '/assets/interstitials/zone-4-dish.png',
  5:  '/assets/interstitials/zone-5-dish.png',
  6:  '/assets/interstitials/zone-6-dish.png',
  7:  '/assets/interstitials/zone-7-dish.png',
  8:  '/assets/interstitials/zone-8-dish.png',
  9:  '/assets/interstitials/zone-9-dish.png',
  10: '/assets/interstitials/zone-10-dish.png',
};

const ZONE_DISHES_NAME: Record<number, string> = {
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

const NANA_PORTRAIT = '/assets/portraits/nana-rose-happy.png';

export function createInterstitial(
  container: HTMLDivElement,
  deps: InterstitialDeps,
): InterstitialController {
  const { zone, onComplete } = deps;

  const dishSrc = ZONE_DISHES[zone] ?? ZONE_DISHES[1]!;
  const dishName = ZONE_DISHES_NAME[zone] ?? 'Mystery Dish';
  const reaction = ZONE_REACTIONS[zone] ?? "Well. That happened.";

  // ── Build DOM ──

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute; inset: 0; z-index: 60;
    background: rgba(20, 10, 5, 0.92);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    opacity: 0;
    transition: opacity 350ms ease-out;
  `;

  // Dish image
  const dishImg = document.createElement('img');
  dishImg.src = dishSrc;
  dishImg.alt = dishName;
  dishImg.draggable = false;
  dishImg.style.cssText = `
    width: min(280px, 70vw);
    height: min(280px, 70vw);
    object-fit: contain;
    border-radius: 16px;
    margin-bottom: 20px;
    transform: scale(0.85);
    transition: transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  // Dish name label
  const nameEl = document.createElement('div');
  nameEl.textContent = dishName;
  nameEl.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 22px; font-weight: 700;
    color: #FFF8F0;
    letter-spacing: 0.5px;
    margin-bottom: 24px;
    text-align: center;
    text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  `;

  // Nana portrait + bubble row
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; flex-direction: row;
    align-items: flex-end; gap: 12px;
    max-width: min(340px, 88vw);
    margin-bottom: 24px;
  `;

  const portrait = document.createElement('img');
  portrait.src = NANA_PORTRAIT;
  portrait.alt = 'Nana Rose';
  portrait.draggable = false;
  portrait.style.cssText = `
    width: 72px; height: 72px;
    object-fit: contain;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid #C4956A;
    background: #3d2b1f;
  `;

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    background: #FFF8F0;
    border: 2px solid #C4956A;
    border-radius: 10px;
    padding: 12px 14px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 20px;
    color: #2C1A0E;
    flex: 1;
    position: relative;
  `;
  bubble.textContent = reaction;

  // Speech bubble tail
  const tail = document.createElement('div');
  tail.style.cssText = `
    position: absolute;
    left: -10px; bottom: 14px;
    width: 0; height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 10px solid #C4956A;
  `;
  const tailInner = document.createElement('div');
  tailInner.style.cssText = `
    position: absolute;
    left: 2px; bottom: -5px;
    width: 0; height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 9px solid #FFF8F0;
  `;
  tail.appendChild(tailInner);
  bubble.appendChild(tail);

  row.appendChild(portrait);
  row.appendChild(bubble);

  // Tap hint
  const hint = document.createElement('div');
  hint.textContent = 'TAP TO CONTINUE \u203A';
  hint.style.cssText = `
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.4px;
    color: #9E6B3A;
    opacity: 0;
    transition: opacity 600ms ease-out;
  `;

  wrapper.appendChild(dishImg);
  wrapper.appendChild(nameEl);
  wrapper.appendChild(row);
  wrapper.appendChild(hint);
  container.appendChild(wrapper);

  // ── Entrance animation ──

  const timers: ReturnType<typeof setTimeout>[] = [];

  timers.push(setTimeout(() => {
    wrapper.style.opacity = '1';
    dishImg.style.transform = 'scale(1)';
  }, 50));

  timers.push(setTimeout(() => {
    hint.style.opacity = '1';
  }, 900));

  // ── Tap to dismiss ──

  let dismissed = false;

  function handleTap(): void {
    if (dismissed) return;
    dismissed = true;

    wrapper.style.transition = 'opacity 250ms ease-in';
    wrapper.style.opacity = '0';

    timers.push(setTimeout(() => {
      onComplete();
    }, 260));
  }

  wrapper.addEventListener('click', handleTap);

  return {
    destroy() {
      timers.forEach(t => clearTimeout(t));
      wrapper.removeEventListener('click', handleTap);
      wrapper.remove();
    },
  };
}
