import { onMount, onCleanup, type ParentComponent } from 'solid-js';
import {
  GlobalBoundary,
  setupGlobalErrorHandlers,
  AssetProvider,
  ScreenProvider,
  ScreenRenderer,
  PauseProvider,
  initPauseKeyboard,
  SettingsMenu,
  TuningProvider,
  useTuning,
  type ScaffoldTuning,
  FeatureFlagProvider,
} from '~/core';
import { initSentry } from '~/core/lib/sentry';
import { parseEnvironment } from '@wolfgames/game-kit';
import { gameConfig, defaultGameData } from '~/game';
import { manifest } from '~/game/asset-manifest';
import {
  GameConfigProvider,
  useGameConfig,
  DevOnly,
  AnalyticsProvider,
  useAnalyticsService,
  GameManifestProvider,
  ViewportProvider,
  ViewportModeWrapper,
} from '@wolfgames/components/solid';
import {
  getViewportModeFromUrl,
  type ViewportMode,
} from '@wolfgames/components/core';
import { GAME_DEFAULTS } from '~/game/tuning';
import './app.css';
import { Show } from 'solid-js';
import { Inspector } from '~/core/dev/inspector';
import { createExampleWorld } from '~/core/systems/ecs/ExamplePlugin';
import { activeDb } from '~/core/systems/ecs/DbBridge';
import { useGameTracking } from '~/game/setup/tracking';
import '~/game/setup/flags'; // registers flag config at module load
import { createSessionTracker } from '~/core/systems/analytics/session-tracker';
import { createLoadingTracker } from '~/core/systems/analytics/loading-tracker';
import { useAssetCoordinator } from '~/core/systems/assets';
import { audioState } from '~/core/systems/audio';
import { createEffect } from 'solid-js';

// Build URL overrides (applied after load, not saved to localStorage)
const urlViewportMode = getViewportModeFromUrl();
const environment = parseEnvironment(import.meta.env.VITE_GAME_KIT_ENV);

/** Reset progress and reload the page */
const handleResetProgress = () => {
  window.location.reload();
};

/** Wires session lifecycle events (start, pause, resume, end) */
function SessionTrackerBridge() {
  const service = useAnalyticsService();
  const cleanup = createSessionTracker(service, gameConfig.initialScreen);
  onCleanup(cleanup);
  return null;
}

/** Wires loading events (start, complete, abandon) to asset coordinator */
function LoadingTrackerBridge() {
  const service = useAnalyticsService();
  const coordinator = useAssetCoordinator();
  const cleanup = createLoadingTracker(service, coordinator.loadingStateSignal);
  onCleanup(cleanup);
  return null;
}

/** Pushes the master-volume signal into Howler whenever the slider moves. */
function VolumeBridge() {
  const coordinator = useAssetCoordinator();
  createEffect(() => {
    coordinator.audio.setMasterVolume(audioState.volume());
  });
  return null;
}

/** SettingsMenu wired with game analytics */
function GameSettingsMenu() {
  const config = useGameConfig();
  const { trackAudioSettingChanged } = useGameTracking();
  return (
    <SettingsMenu
      onResetProgress={!config.isProduction() ? handleResetProgress : undefined}
      onAudioSettingChanged={trackAudioSettingChanged}
    />
  );
}

/**
 * Bridges the tuning system ↔ viewport system.
 * Reads initial mode from tuning (with URL override), syncs changes back.
 */
const TuningViewportBridge: ParentComponent = (props) => {
  const tuning = useTuning<ScaffoldTuning>();

  // Resolve initial mode: URL param > gameConfig default > tuning default
  const resolveInitialMode = (): ViewportMode => {
    if (urlViewportMode) return urlViewportMode;
    if (gameConfig.defaultViewportMode) return gameConfig.defaultViewportMode;
    return tuning.scaffold.viewport?.mode ?? 'small';
  };

  const handleModeChange = (mode: ViewportMode) => {
    tuning.setScaffoldPath('viewport.mode', mode);
    tuning.save();
  };

  return (
    <ViewportProvider
      initialMode={resolveInitialMode()}
      onModeChange={handleModeChange}
    >
      {props.children}
    </ViewportProvider>
  );
};

// Example ECS database — shown in Inspector when no game is active
const exampleDB = createExampleWorld();

export default function App() {
  onMount(async () => {
    // Initialize error tracking
    initSentry(environment);

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Initialize pause keyboard (spacebar)
    initPauseKeyboard();
  });

  return (
    <GameConfigProvider debug>
      <AnalyticsProvider>
        <SessionTrackerBridge />
        <GlobalBoundary>
          <TuningProvider gameDefaults={GAME_DEFAULTS}>
            <DevOnly>
              <Show when={activeDb()} fallback={<Inspector db={exampleDB} />}>
                {(db) => <Inspector db={db()} />}
              </Show>
            </DevOnly>
            <FeatureFlagProvider>
              <TuningViewportBridge>
                <ViewportModeWrapper>
                  {/* Settings Menu - Top Right Corner */}
                  <div class="fixed top-2 right-2 z-[9999]">
                    <GameSettingsMenu />
                  </div>
                  <PauseProvider>
                    <GameManifestProvider 
                      manifest={manifest} 
                      defaultGameData={defaultGameData}
                    >
                      <AssetProvider>
                        <LoadingTrackerBridge />
                        <VolumeBridge />
                        <ScreenProvider options={{ initialScreen: gameConfig.initialScreen, screenAssets: gameConfig.screenAssets }}>
                          <ScreenRenderer screens={gameConfig.screens} />
                        </ScreenProvider>
                      </AssetProvider>
                    </GameManifestProvider>
                  </PauseProvider>
                </ViewportModeWrapper>
              </TuningViewportBridge>
            </FeatureFlagProvider>
          </TuningProvider>
        </GlobalBoundary>
      </AnalyticsProvider>
    </GameConfigProvider>
  );
}
