import { onMount, onCleanup } from 'solid-js';
import { useScreen, type ScreenId } from '~/core/systems/screens';
import { useAssets } from '~/core/systems/assets';
import { useTuning, type ScaffoldTuning } from '~/core';
import { useGameTracking } from '~/game/setup/tracking';

import type { GameTuning } from '~/game/tuning';

// Game-specific start screen — swap this import for a different game
import { setupStartScreen } from '~/game/mygame/screens/startView';

export default function StartScreen() {
  const { goto } = useScreen();
  const { coordinator, initGpu, unlockAudio, loadCore, loadAudio, loadBundle } = useAssets();
  const tuning = useTuning<ScaffoldTuning, GameTuning>();
  const { trackGameStart } = useGameTracking();
  let containerRef: HTMLDivElement | undefined;

  // Setup game-specific start screen controller
  const startScreen = setupStartScreen({
    goto: (screen) => { void goto(screen as ScreenId); },
    coordinator,
    initGpu,
    unlockAudio,
    loadCore,
    loadAudio,
    loadBundle,
    tuning,
    analytics: { trackGameStart },
  });

  onMount(() => {
    if (containerRef) startScreen.init(containerRef);
  });

  onCleanup(() => startScreen.destroy());

  return (
    <div class={`fixed inset-0`} style={{ 'background-color': startScreen.backgroundColor }}>
      {/* Pixi canvas container */}
      <div ref={containerRef} class="absolute inset-0" />

    </div>
  );
}
