/**
 * Generic Progress Service Factory
 *
 * Creates a typed progress service backed by localStorage.
 * Games configure with their own progress shape.
 *
 * Usage:
 *   const progress = createProgressService<MyProgress>({
 *     key: 'mygame_progress',
 *     version: 1,
 *     defaults: { version: 1, score: 0, level: 1 },
 *   });
 *   progress.load();
 *   progress.save({ ...data });
 *   progress.clear();
 */

import { createVersionedStore, type VersionedStoreConfig } from '~/core/utils/storage';

export interface BaseProgress {
  version: number;
}

export interface ProgressServiceConfig<T extends BaseProgress> {
  /** localStorage key */
  key: string;
  /** Schema version (bumping this resets stored data) */
  version: number;
  /** Default progress state */
  defaults: T;
  /** Optional validation function */
  validate?: (data: unknown) => boolean;
}

export interface ProgressService<T extends BaseProgress> {
  load: () => T;
  save: (data: T) => void;
  clear: () => void;
}

export function createProgressService<T extends BaseProgress>(
  config: ProgressServiceConfig<T>
): ProgressService<T> {
  const store = createVersionedStore<T>({
    key: config.key,
    version: config.version,
    defaults: config.defaults,
    validate: config.validate,
  });

  return {
    load: () => store.load(),
    save: (data: T) => store.save(data),
    clear: () => store.clear(),
  };
}
