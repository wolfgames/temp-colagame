/**
 * Thin scaffold wrapper over game-components' createAssetCoordinator.
 *
 * Adds scaffold-specific concerns:
 * - High-level loaders: loadBoot, loadTheme, loadCore, loadAudio, loadScene
 * - Auto-creates PixiLoader on initGpu() (no param needed)
 * - ready / gpuReady signals
 * - Audio convenience methods (play, setMasterVolume, unlock)
 * - getGpuLoader() accessor
 * - unloadBundle, unloadBundles, unloadScene
 */

import {
  createAssetCoordinator,
  createSignal,
  type Manifest,
  type LoadingState,
  KIND_TO_PREFIX,
  KIND_TO_LOADER,
} from '@wolfgames/components/core';
import { createDomLoader } from '@wolfgames/components/core';
import { createHowlerLoader } from '@wolfgames/components/howler';
import { createPixiLoader, type PixiLoader } from '@wolfgames/components/pixi';
import type { Howl } from 'howler';
import type { ProgressCallback } from './types';

type LoaderType = 'dom' | 'gpu' | 'audio';

function getLoaderTypeForBundle(
  bundleName: string,
  manifest: Manifest
): LoaderType | null {
  const bundle = manifest.bundles.find((b) => b.name === bundleName);
  if (!bundle) return null;
  if (bundle.kind && KIND_TO_LOADER[bundle.kind]) {
    return KIND_TO_LOADER[bundle.kind] as LoaderType;
  }
  for (const [kind, prefix] of Object.entries(KIND_TO_PREFIX)) {
    if (bundleName.startsWith(prefix) && KIND_TO_LOADER[kind as keyof typeof KIND_TO_LOADER]) {
      return KIND_TO_LOADER[kind as keyof typeof KIND_TO_LOADER] as LoaderType;
    }
  }
  return null;
}

function bundlesByPrefix(manifest: Manifest, prefix: string): string[] {
  return manifest.bundles
    .filter((b) => b.name.startsWith(prefix))
    .map((b) => b.name);
}

export interface AssetCoordinatorFacade {
  loadingStateSignal: { get: () => LoadingState; set: (v: LoadingState) => void; subscribe: (fn: (v: LoadingState) => void) => () => void };
  ready: { get: () => boolean; set: (v: boolean) => void; subscribe: (fn: (v: boolean) => void) => () => void };
  gpuReady: { get: () => boolean; set: (v: boolean) => void; subscribe: (fn: (v: boolean) => void) => () => void };
  isLoaded(bundleName: string): boolean;
  dom: {
    getFrameURL(atlasAlias: string, frameName: string): Promise<string>;
  };
  loadBundle(name: string, onProgress?: ProgressCallback): Promise<void>;
  backgroundLoadBundle(name: string): Promise<void>;
  preloadScene(name: string): Promise<void>;
  loadBoot(onProgress?: ProgressCallback): Promise<void>;
  loadCore(onProgress?: ProgressCallback): Promise<void>;
  loadTheme(onProgress?: ProgressCallback): Promise<void>;
  loadAudio(onProgress?: ProgressCallback): Promise<void>;
  loadScene(name: string, onProgress?: ProgressCallback): Promise<void>;
  initGpu(): Promise<void>;
  unloadBundle(name: string): void;
  unloadBundles(names: string[]): void;
  unloadScene(sceneName: string): void;
  audio: {
    play(channel: string, sprite?: string, opts?: { volume?: number }): number;
    stop(channel: string, id?: number): void;
    setMasterVolume(volume: number): void;
    unlock(): Promise<void>;
    get<T = unknown>(alias: string): T | null;
  };
  getLoader<T = unknown>(type: LoaderType): T | null;
}

export function createCoordinatorFacade(manifest: Manifest): AssetCoordinatorFacade {
  const domLoader = createDomLoader();
  const howlerLoader = createHowlerLoader();

  const coordinator = createAssetCoordinator({
    manifest,
    loaders: { dom: domLoader, audio: howlerLoader },
  });

  const readySignal = createSignal(false);
  const gpuReadySignal = createSignal(false);

  let bootThemeDone = false;
  const markReady = () => {
    if (!bootThemeDone) {
      bootThemeDone = true;
      readySignal.set(true);
    }
  };

  const loadWithProgress = async (
    names: string[],
    onProgress?: ProgressCallback
  ): Promise<void> => {
    if (names.length === 0) return;
    for (let i = 0; i < names.length; i++) {
      await coordinator.loadBundle(names[i]);
      onProgress?.((i + 1) / names.length);
    }
  };

  const loadBoot = async (onProgress?: ProgressCallback) => {
    const names = bundlesByPrefix(manifest, 'boot-');
    await loadWithProgress(names, onProgress);
    markReady();
  };

  const loadTheme = async (onProgress?: ProgressCallback) => {
    const names = bundlesByPrefix(manifest, 'theme-');
    await loadWithProgress(names, onProgress);
    markReady();
  };

  const loadCore = async (onProgress?: ProgressCallback) => {
    const names = bundlesByPrefix(manifest, 'core-');
    await loadWithProgress(names, onProgress);
  };

  const loadAudio = async (onProgress?: ProgressCallback) => {
    const names = bundlesByPrefix(manifest, 'audio-');
    await loadWithProgress(names, onProgress);
  };

  const loadScene = async (name: string, onProgress?: ProgressCallback) => {
    const bundleName = name.startsWith('scene-') ? name : `scene-${name}`;
    await coordinator.loadBundle(bundleName);
    onProgress?.(1);
  };

  let gpuInit: Promise<void> | null = null;

  const initGpu = () => {
    if (!gpuInit) {
      gpuInit = (async () => {
        coordinator.initLoader('gpu', createPixiLoader());
        gpuReadySignal.set(true);
      })();
    }
    return gpuInit;
  };

  const unloadBundle = (name: string) => {
    const type = getLoaderTypeForBundle(name, manifest);
    if (!type) return;
    const loader = coordinator.getLoader(type);
    if (loader && typeof (loader as { unloadBundle?: (n: string) => void }).unloadBundle === 'function') {
      (loader as { unloadBundle: (n: string) => void }).unloadBundle(name);
    }
  };

  const unloadBundles = (names: string[]) => {
    for (const name of names) unloadBundle(name);
  };

  const unloadScene = (sceneName: string) => {
    const bundleName = sceneName.startsWith('scene-') ? sceneName : `scene-${sceneName}`;
    unloadBundle(bundleName);
  };

  const isLoaded = (bundleName: string) =>
    coordinator.loadingState.get().loaded.includes(bundleName);

  const getFrameURL = async (atlasAlias: string, frameName: string): Promise<string> => {
    const sheet = domLoader.getSpritesheet(atlasAlias);
    if (!sheet) throw new Error(`Spritesheet not found: ${atlasAlias}`);
    const frameData = (sheet.frames as Record<string, { frame: { x: number; y: number; w: number; h: number } }>)[frameName];
    if (!frameData) throw new Error(`Frame not found: ${frameName}`);
    const { x, y, w, h } = frameData.frame;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.drawImage(sheet.image, x, y, w, h, 0, 0, w, h);
    return canvas.toDataURL();
  };

  return {
    loadingStateSignal: coordinator.loadingState,
    ready: readySignal,
    gpuReady: gpuReadySignal,
    isLoaded,
    dom: { getFrameURL },

    loadBundle: (name, onProgress?) =>
      coordinator.loadBundle(name).then(() => onProgress?.(1)),
    backgroundLoadBundle: (name) => coordinator.loadBundle(name),
    preloadScene: (name) => loadScene(name),

    loadBoot,
    loadCore,
    loadTheme,
    loadAudio,
    loadScene,

    initGpu,
    unloadBundle,
    unloadBundles,
    unloadScene,

    audio: {
      play(channel: string, sprite?: string, opts?: { volume?: number }): number {
        const howl = howlerLoader.get(channel) as Howl | null;
        if (!howl) return -1;
        if (opts?.volume != null) howl.volume(opts.volume);
        return howl.play(sprite);
      },
      stop(channel: string, id?: number): void {
        howlerLoader.stop(channel, id);
      },
      setMasterVolume(volume: number): void {
        howlerLoader.setVolume(volume);
      },
      unlock(): Promise<void> {
        return howlerLoader.unlock();
      },
      get<T = unknown>(alias: string): T | null {
        return (howlerLoader.get(alias) as T | null) ?? null;
      },
    },

    getLoader: <T>(type: LoaderType) => coordinator.getLoader(type) as T | null,
  };
}
