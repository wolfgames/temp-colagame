/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Leaderboard Screen
 *
 * Ranked player list with tabs, podium top-3, current player highlight.
 * DOM-based (SolidJS or imperative DOM).
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: tab definitions (set to empty array for no tabs)
const TABS = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
  { key: 'weekly', label: 'Weekly' },
];

// ADAPT: colors
const COLORS = {
  background: '#1a1a2e',
  headerBg: '#16213e',
  tabActive: '#4a8c1c',
  tabInactive: 'rgba(255,255,255,0.2)',
  podiumGold: '#ffd700',
  podiumSilver: '#c0c0c0',
  podiumBronze: '#cd7f32',
  currentPlayerBg: 'rgba(74, 140, 28, 0.2)',
  currentPlayerBorder: '#4a8c1c',
  rowBorder: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
};

// ADAPT: current player identifier
const CURRENT_PLAYER_ID = 'me';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  HEADER_MS: 300,
  TAB_ENTRANCE_MS: 300,
  TAB_SWITCH_MS: 200,
  PODIUM_DELAY_MS: 200,
  PODIUM_STAGGER_MS: 80,
  PODIUM_DURATION_MS: 400,      // back.out(1.3)
  ROW_BASE_DELAY_MS: 500,
  ROW_STAGGER_MS: 40,
  ROW_DURATION_MS: 300,         // power2.out
  HIGHLIGHT_DELAY_MS: 400,      // after last row
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score: number;
  avatar?: string;  // ADAPT: URL, initials, or null
}

// ADAPT: match your data fetching pattern
interface LeaderboardScreenDeps {
  onBack: () => void;
  getEntries: (tab: string) => LeaderboardEntry[];
  currentPlayerId: string;
}

interface LeaderboardScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════ */

function createLeaderboardScreen(deps: LeaderboardScreenDeps): LeaderboardScreenController {
  let wrapper: HTMLDivElement | null = null;
  let listContainer: HTMLDivElement | null = null;
  let activeTab = TABS[0]?.key ?? 'global';

  function renderEntries(entries: LeaderboardEntry[]): void {
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const podium = entries.filter(e => e.rank <= 3);
    const rest = entries.filter(e => e.rank > 3);
    const currentPlayer = entries.find(e => e.id === deps.currentPlayerId);

    // ── Podium (top 3) ──
    podium.forEach((entry, i) => {
      const row = createPodiumRow(entry);
      listContainer!.appendChild(row);
      gsap.fromTo(row,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1, scale: 1,
          duration: ANIM.PODIUM_DURATION_MS / 1000,
          delay: (ANIM.PODIUM_DELAY_MS + i * ANIM.PODIUM_STAGGER_MS) / 1000,
          ease: 'back.out(1.3)',
        },
      );
    });

    // ── Divider ──
    if (podium.length > 0 && rest.length > 0) {
      const hr = document.createElement('div');
      hr.style.cssText = `height: 1px; background: ${COLORS.rowBorder}; margin: 8px 0;`;
      listContainer!.appendChild(hr);
    }

    // ── Regular entries ──
    rest.forEach((entry, i) => {
      const row = createRegularRow(entry, entry.id === deps.currentPlayerId);
      listContainer!.appendChild(row);
      gsap.fromTo(row,
        { opacity: 0, x: 20 },
        {
          opacity: 1, x: 0,
          duration: ANIM.ROW_DURATION_MS / 1000,
          delay: (ANIM.ROW_BASE_DELAY_MS + i * ANIM.ROW_STAGGER_MS) / 1000,
          ease: 'power2.out',
        },
      );
    });

    // ── Sticky current player (if not in visible range) ──
    if (currentPlayer && currentPlayer.rank > 10) {
      const stickyRow = createRegularRow(currentPlayer, true);
      stickyRow.style.position = 'sticky';
      stickyRow.style.bottom = '0';
      listContainer!.appendChild(stickyRow);
      const delay = (ANIM.ROW_BASE_DELAY_MS + rest.length * ANIM.ROW_STAGGER_MS) / 1000;
      gsap.fromTo(stickyRow,
        { opacity: 0, x: 20 },
        { opacity: 1, x: -4, duration: 0.28, delay, ease: 'power2.out' },
      );
      gsap.to(stickyRow, {
        x: 0, duration: 0.12, delay: delay + 0.28, ease: 'power2.out',
      });
    }
  }

  return {
    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        background: ${COLORS.background};
        font-family: system-ui, -apple-system, sans-serif;
        color: ${COLORS.text};
        touch-action: pan-y; user-select: none; -webkit-user-select: none;
      `;

      // ── Header ──
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex; align-items: center;
        padding: 16px; background: ${COLORS.headerBg};
        opacity: 0;
      `;
      gsap.to(header, {
        opacity: 1,
        duration: ANIM.HEADER_MS / 1000,
        ease: 'power2.out',
      });

      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.style.cssText = `
        background: none; border: none; color: ${COLORS.text};
        font-size: 16px; font-weight: 600; cursor: pointer;
        min-width: 48px; min-height: 48px; padding: 8px 12px;
        -webkit-tap-highlight-color: transparent;
      `;
      backBtn.addEventListener('click', () => deps.onBack());

      const heading = document.createElement('h2');
      heading.textContent = 'Leaderboard';
      heading.style.cssText = 'flex: 1; text-align: center; font-size: 20px; font-weight: 700; margin: 0;';

      const spacer = document.createElement('div');
      spacer.style.width = '48px';
      header.append(backBtn, heading, spacer);

      // ── Tab bar ──
      let tabBar: HTMLDivElement | null = null;
      if (TABS.length > 1) {
        tabBar = document.createElement('div');
        tabBar.style.cssText = `
          display: flex; gap: 8px; padding: 12px 16px;
          background: ${COLORS.headerBg}; opacity: 0;
        `;
        gsap.to(tabBar, {
          opacity: 1,
          duration: ANIM.TAB_ENTRANCE_MS / 1000,
          delay: 0.1,
          ease: 'power2.out',
        });

        for (const tab of TABS) {
          const btn = document.createElement('button');
          btn.textContent = tab.label;
          btn.dataset.tab = tab.key;
          btn.style.cssText = `
            flex: 1; padding: 8px 16px; border: none; border-radius: 8px;
            font-size: 14px; font-weight: 600; cursor: pointer;
            min-height: 48px;
            background: ${tab.key === activeTab ? COLORS.tabActive : COLORS.tabInactive};
            color: ${COLORS.text};
            transition: background ${ANIM.TAB_SWITCH_MS}ms ease-out;
            -webkit-tap-highlight-color: transparent;
          `;
          btn.addEventListener('click', () => {
            activeTab = tab.key;
            // Update tab styles
            tabBar!.querySelectorAll('button').forEach(b => {
              (b as HTMLButtonElement).style.background =
                b.dataset.tab === activeTab ? COLORS.tabActive : COLORS.tabInactive;
            });
            renderEntries(deps.getEntries(activeTab));
          });
          tabBar.appendChild(btn);
        }
      }

      // ── List container ──
      listContainer = document.createElement('div');
      listContainer.style.cssText = `
        flex: 1; overflow-y: auto; padding: 8px 16px;
        -webkit-overflow-scrolling: touch;
      `;

      wrapper.appendChild(header);
      if (tabBar) wrapper.appendChild(tabBar);
      wrapper.appendChild(listContainer);
      container.appendChild(wrapper);

      renderEntries(deps.getEntries(activeTab));
    },

    destroy() {
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
      listContainer = null;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: ROW FACTORIES (LOCKED STRUCTURE)
 * ═══════════════════════════════════════════════════════════════════════ */

const PODIUM_COLORS = [COLORS.podiumGold, COLORS.podiumSilver, COLORS.podiumBronze];
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];

function createPodiumRow(entry: LeaderboardEntry): HTMLDivElement {
  const row = document.createElement('div');
  const color = PODIUM_COLORS[entry.rank - 1] ?? COLORS.text;
  row.style.cssText = `
    display: flex; align-items: center; gap: 12px;
    padding: 14px 12px; margin: 4px 0;
    border-radius: 12px;
    background: rgba(255,255,255,0.05);
    opacity: 0; transform: scale(0.9);
  `;

  const medal = document.createElement('span');
  medal.textContent = PODIUM_MEDALS[entry.rank - 1] ?? String(entry.rank);
  medal.style.cssText = 'font-size: 28px; width: 40px; text-align: center;';

  const name = document.createElement('span');
  name.textContent = entry.name;
  name.style.cssText = `flex: 1; font-size: 16px; font-weight: 600; color: ${color};`;

  const score = document.createElement('span');
  score.textContent = entry.score.toLocaleString();
  score.style.cssText = `font-size: 18px; font-weight: 700; color: ${color};`;

  row.append(medal, name, score);
  return row;
}

function createRegularRow(entry: LeaderboardEntry, isCurrentPlayer: boolean): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; align-items: center; gap: 12px;
    padding: 12px;
    border-bottom: 1px solid ${COLORS.rowBorder};
    opacity: 0; transform: translateX(20px);
    ${isCurrentPlayer ? `
      background: ${COLORS.currentPlayerBg};
      border: 1px solid ${COLORS.currentPlayerBorder};
      border-radius: 8px;
      border-bottom: 1px solid ${COLORS.currentPlayerBorder};
    ` : ''}
  `;

  const rank = document.createElement('span');
  rank.textContent = String(entry.rank);
  rank.style.cssText = `
    width: 32px; text-align: center;
    font-size: 14px; font-weight: 600;
    color: ${isCurrentPlayer ? COLORS.text : COLORS.textMuted};
  `;

  const name = document.createElement('span');
  name.textContent = isCurrentPlayer ? `► ${entry.name}` : entry.name;
  name.style.cssText = `flex: 1; font-size: 15px; font-weight: ${isCurrentPlayer ? '700' : '500'};`;

  const score = document.createElement('span');
  score.textContent = entry.score.toLocaleString();
  score.style.cssText = 'font-size: 15px; font-weight: 600;';

  row.append(rank, name, score);
  return row;
}
