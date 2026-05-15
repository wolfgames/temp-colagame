/* ═══════════════════════════════════════════════════════════════════════
 * WRAPPER TEMPLATE: Settings Screen
 *
 * Audio/music toggle and volume controls.
 * DOM-based panel — can be full-screen or overlay.
 *
 * Copy this file and change only lines marked // ADAPT:
 * ═══════════════════════════════════════════════════════════════════════ */

import gsap from 'gsap';

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 1: CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════ */

// ADAPT: persistence keys for localStorage (or your save system)
const STORAGE_KEYS = {
  musicEnabled: 'settings_music_enabled',
  musicVolume: 'settings_music_volume',
  sfxEnabled: 'settings_sfx_enabled',
  sfxVolume: 'settings_sfx_volume',
  hapticsEnabled: 'settings_haptics_enabled',
};

// ADAPT: accent color for toggles and sliders
const ACCENT_COLOR = '#4a8c1c';
const ACCENT_COLOR_OFF = '#555555';

// ADAPT: background style
const OVERLAY_BG = 'rgba(0, 0, 0, 0.85)';
const PANEL_BG = '#1a1a2e';

// ADAPT: which settings to show
const SHOW_HAPTICS = true; // typically mobile-only

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 2: ANIMATION TIMING (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANIM = {
  PANEL_SLIDE_MS: 400,       // power2.out
  OVERLAY_FADE_MS: 300,      // power2.out
  ROW_STAGGER_MS: 60,
  ROW_BASE_DELAY_MS: 200,
  TOGGLE_MS: 200,            // power2.out
  EXIT_SLIDE_MS: 300,        // power2.in
} as const;

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 3: TYPES
 * ═══════════════════════════════════════════════════════════════════════ */

interface SettingsState {
  musicEnabled: boolean;
  musicVolume: number;   // 0–100
  sfxEnabled: boolean;
  sfxVolume: number;     // 0–100
  hapticsEnabled: boolean;
}

// ADAPT: match your audio system interface
interface SettingsScreenDeps {
  onBack: () => void;
  onMusicToggle?: (enabled: boolean) => void;
  onMusicVolume?: (volume: number) => void;
  onSfxToggle?: (enabled: boolean) => void;
  onSfxVolume?: (volume: number) => void;
  onHapticsToggle?: (enabled: boolean) => void;
}

interface SettingsScreenController {
  init(container: HTMLDivElement): void;
  destroy(): void;
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 4: PERSISTENCE HELPERS
 * ═══════════════════════════════════════════════════════════════════════ */

function loadSettings(): SettingsState {
  const get = (key: string, fallback: string) => {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  };
  return {
    musicEnabled: get(STORAGE_KEYS.musicEnabled, 'true') === 'true',
    musicVolume: Number(get(STORAGE_KEYS.musicVolume, '80')),
    sfxEnabled: get(STORAGE_KEYS.sfxEnabled, 'true') === 'true',
    sfxVolume: Number(get(STORAGE_KEYS.sfxVolume, '80')),
    hapticsEnabled: get(STORAGE_KEYS.hapticsEnabled, 'true') === 'true',
  };
}

function saveSetting(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded — silent */ }
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 5: CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════ */

function createSettingsScreen(deps: SettingsScreenDeps): SettingsScreenController {
  let wrapper: HTMLDivElement | null = null;
  let state: SettingsState = loadSettings();

  return {
    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: absolute; inset: 0;
        background: ${OVERLAY_BG};
        display: flex; flex-direction: column;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
        touch-action: none; user-select: none; -webkit-user-select: none;
        opacity: 0;
      `;

      // ── Panel ──
      const panel = document.createElement('div');
      panel.style.cssText = `
        width: 100%; max-width: 400px;
        margin-top: 60px; padding: 24px;
        background: ${PANEL_BG};
        border-radius: 16px;
        transform: translateY(40px); opacity: 0;
      `;

      // ── Header ──
      const header = document.createElement('div');
      header.style.cssText = 'display: flex; align-items: center; margin-bottom: 24px;';

      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.style.cssText = `
        background: none; border: none; color: #ffffff;
        font-size: 16px; font-weight: 600; cursor: pointer;
        min-width: 48px; min-height: 48px;
        padding: 8px 12px;
        -webkit-tap-highlight-color: transparent;
      `;
      backBtn.addEventListener('click', () => deps.onBack());

      const heading = document.createElement('h2');
      heading.textContent = 'Settings';
      heading.style.cssText = 'flex: 1; text-align: center; font-size: 20px; font-weight: 700; margin: 0;';

      const spacer = document.createElement('div');
      spacer.style.width = '48px'; // balance the back button

      header.append(backBtn, heading, spacer);
      panel.appendChild(header);

      // ── Setting Rows ──
      const rows: HTMLElement[] = [];
      let rowIndex = 0;

      // Music toggle
      rows.push(createToggleRow('Music', state.musicEnabled, (v) => {
        state.musicEnabled = v;
        saveSetting(STORAGE_KEYS.musicEnabled, String(v));
        deps.onMusicToggle?.(v);
      }));

      // Music volume
      rows.push(createSliderRow('Music Volume', state.musicVolume, (v) => {
        state.musicVolume = v;
        saveSetting(STORAGE_KEYS.musicVolume, String(v));
        deps.onMusicVolume?.(v);
      }));

      // SFX toggle
      rows.push(createToggleRow('Sound Effects', state.sfxEnabled, (v) => {
        state.sfxEnabled = v;
        saveSetting(STORAGE_KEYS.sfxEnabled, String(v));
        deps.onSfxToggle?.(v);
      }));

      // SFX volume
      rows.push(createSliderRow('SFX Volume', state.sfxVolume, (v) => {
        state.sfxVolume = v;
        saveSetting(STORAGE_KEYS.sfxVolume, String(v));
        deps.onSfxVolume?.(v);
      }));

      // Haptics toggle (mobile only)
      if (SHOW_HAPTICS) {
        rows.push(createToggleRow('Haptics', state.hapticsEnabled, (v) => {
          state.hapticsEnabled = v;
          saveSetting(STORAGE_KEYS.hapticsEnabled, String(v));
          deps.onHapticsToggle?.(v);
        }));
      }

      for (const row of rows) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        panel.appendChild(row);
      }

      wrapper.appendChild(panel);
      container.appendChild(wrapper);

      // ── Entrance animations (LOCKED timing) ──
      gsap.to(wrapper, {
        opacity: 1,
        duration: ANIM.OVERLAY_FADE_MS / 1000,
        ease: 'power2.out',
      });
      gsap.to(panel, {
        opacity: 1, y: 0,
        duration: ANIM.PANEL_SLIDE_MS / 1000,
        ease: 'power2.out',
      });

      rows.forEach((row, i) => {
        gsap.to(row, {
          opacity: 1, y: 0,
          duration: 0.3,
          delay: (ANIM.ROW_BASE_DELAY_MS + i * ANIM.ROW_STAGGER_MS) / 1000,
          ease: 'power2.out',
        });
      });
    },

    destroy() {
      if (wrapper) gsap.killTweensOf(wrapper.querySelectorAll('*'));
      wrapper?.remove();
      wrapper = null;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
 * SECTION 6: UI COMPONENT FACTORIES (LOCKED)
 * ═══════════════════════════════════════════════════════════════════════ */

function createToggleRow(label: string, initial: boolean, onChange: (v: boolean) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
  `;

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'font-size: 16px; font-weight: 500;';

  let enabled = initial;
  const toggle = document.createElement('button');
  toggle.style.cssText = `
    width: 52px; height: 28px; border-radius: 14px; border: none;
    background: ${enabled ? ACCENT_COLOR : ACCENT_COLOR_OFF};
    position: relative; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    min-width: 48px; min-height: 48px;
    padding: 10px 0;
    box-sizing: content-box;
  `;

  const thumb = document.createElement('div');
  thumb.style.cssText = `
    width: 24px; height: 24px; border-radius: 12px;
    background: #ffffff;
    position: absolute; top: 12px;
    left: ${enabled ? '26px' : '2px'};
    pointer-events: none;
  `;
  toggle.appendChild(thumb);

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    gsap.to(toggle, {
      backgroundColor: enabled ? ACCENT_COLOR : ACCENT_COLOR_OFF,
      duration: ANIM.TOGGLE_MS / 1000,
      ease: 'power2.out',
    });
    gsap.to(thumb, {
      left: enabled ? '26px' : '2px',
      duration: ANIM.TOGGLE_MS / 1000,
      ease: 'power2.out',
    });
    onChange(enabled);
  });

  row.append(labelEl, toggle);
  return row;
}

function createSliderRow(label: string, initial: number, onChange: (v: number) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 16px;
  `;

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.7); white-space: nowrap;';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(initial);
  slider.style.cssText = `
    flex: 1; height: 4px; border-radius: 2px;
    appearance: none; -webkit-appearance: none;
    background: linear-gradient(to right, ${ACCENT_COLOR} ${initial}%, #555 ${initial}%);
    outline: none; cursor: pointer;
    min-height: 48px;
  `;

  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    slider.style.background = `linear-gradient(to right, ${ACCENT_COLOR} ${v}%, #555 ${v}%)`;
    onChange(v);
  });

  row.append(labelEl, slider);
  return row;
}
