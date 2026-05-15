import {
  createContext,
  useContext,
  onMount,
  onCleanup,
  Show,
  type ParentProps,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { useAnalyticsService, useConfigState } from '@wolfgames/components/solid';
import type { FeatureFlagState } from './types';
import { getRegisteredFlagConfig } from './registry';
import { loadFlagCache, saveFlagCache, validateFlags } from './cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FeatureFlagContext = createContext<FeatureFlagState<any>>();

export function FeatureFlagProvider(props: ParentProps) {
  const config = getRegisteredFlagConfig();

  if (!config) {
    throw new Error(
      'FeatureFlagProvider: no config registered. Call registerFlagConfig() before mounting.',
    );
  }

  const { defaults, validators, userId, timeoutMs = 2000 } = config;
  const configState = useConfigState();
  const projectId = configState.service.get()?.projectId ?? 'unknown';
  const storagePrefix = config.storagePrefix ?? `${projectId}_ff_`;
  const cached = loadFlagCache(storagePrefix, userId, defaults, validators);
  const analytics = useAnalyticsService();
  const ph = analytics.getPosthog();
  const defs = defaults as Record<string, unknown>;

  const [state, setState] = createStore<FeatureFlagState<typeof defaults>>({
    flags: cached ?? defaults,
    isReady: !!cached,
  });

  let isSettled = false;

  const processFlags = (source: string) => {
    if (!ph) return;

    const raw: Record<string, unknown> = {};

    for (const key of Object.keys(defaults)) {
      if (typeof defs[key] === 'boolean') {
        raw[key] = ph.isFeatureEnabled(key);
      } else {
        raw[key] = ph.getFeatureFlag(key);
      }
    }

    const nextFlags = validateFlags(raw, defaults, validators);

    setState('flags', nextFlags);
    setState('isReady', true);
    saveFlagCache(storagePrefix, userId, nextFlags);

    // Register flag values as super properties
    const superProps: Record<string, unknown> = {};
    for (const key of Object.keys(nextFlags as object)) {
      superProps[key] = (nextFlags as Record<string, unknown>)[key];
    }
    ph.register(superProps);

    console.debug(`[FeatureFlags] Resolved via ${source}`, nextFlags);
    isSettled = true;
  };

  // PostHog is already initialized (service is ready before provider mounts)
  if (ph) {
    const stopListening = ph.onFeatureFlags(() => processFlags('posthog_update'));
    onCleanup(() => {
      if (typeof stopListening === 'function') stopListening();
    });

    // Immediate check in case flags are already loaded
    const firstKey = Object.keys(defaults)[0];
    if (firstKey && ph.getFeatureFlag(firstKey) !== undefined) {
      processFlags('immediate_check');
    }
  }

  // Timeout fallback — unblock UI even if PostHog never loads
  onMount(() => {
    const timeoutId = window.setTimeout(() => {
      if (!isSettled) {
        console.warn('[FeatureFlags] Timeout exceeded. Unblocking UI with current data.');
        setState('isReady', true);
        isSettled = true;
      }
    }, timeoutMs);

    onCleanup(() => clearTimeout(timeoutId));
  });

  return (
    <FeatureFlagContext.Provider value={state}>
      <Show when={state.isReady}>
        {props.children}
      </Show>
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags<T extends object = Record<string, unknown>>(): FeatureFlagState<T> {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context as FeatureFlagState<T>;
}
