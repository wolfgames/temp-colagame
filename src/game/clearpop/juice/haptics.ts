import { createSignal, createRoot } from 'solid-js';
import { getStored, setStored } from '~/core/utils/storage';

const STORAGE_KEY = 'app_haptic_enabled';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid';

const PATTERNS: Record<HapticStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 40,
  rigid: 30,
};

export interface HapticState {
  enabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

function createHapticState(): HapticState {
  const [enabled, setEnabledSignal] = createSignal(getStored(STORAGE_KEY, true));

  const setEnabled = (value: boolean) => {
    setEnabledSignal(value);
    setStored(STORAGE_KEY, value);
  };

  return {
    enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled()),
  };
}

export const hapticState = createRoot(createHapticState);

export function haptic(style: HapticStyle): void {
  if (!hapticState.enabled()) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[style]);
}
