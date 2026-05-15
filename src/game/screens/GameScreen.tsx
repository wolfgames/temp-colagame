import { onMount, onCleanup } from 'solid-js';

import { useAssets } from '~/core/systems/assets';
import { PauseOverlay, useTuning, type ScaffoldTuning } from '~/core';
import { useScreen, type ScreenId } from '~/core/systems/screens';
import { useAudio } from '~/core/systems/audio';
import { useGameTracking } from '~/game/setup/tracking';

import type { GameTuning } from '~/game/tuning';
import { useGameData } from '~/game/screens/useGameData';
import { gameState } from '~/game/state';

import { setupGame } from '~/game/clearpop';

export default function GameScreen() {
  const { coordinator } = useAssets();
  const { goto } = useScreen();
  const tuning = useTuning<ScaffoldTuning, GameTuning>();
  const audio = useAudio();
  const gameData = useGameData();
  const analytics = useGameTracking();
  let containerRef: HTMLDivElement | undefined;

  const controller = setupGame({
    coordinator,
    tuning,
    audio,
    gameData,
    analytics,
    goto: (screen) => { void goto(screen as ScreenId); },
  });

  onMount(() => {
    if (containerRef) controller.init(containerRef);
  });

  onCleanup(() => controller.destroy());

  return (
    <div class="fixed inset-0 bg-black">
      {/* Engine canvas container */}
      <div
        ref={containerRef}
        class="absolute inset-0"
      />

      {/* Accessibility: Screen reader announcements */}
      <div
        class="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {controller.ariaText()}
      </div>

      {/* Pause overlay */}
      <PauseOverlay />

    </div>
  );
}
