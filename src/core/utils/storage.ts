/**
 * localStorage utilities for persisting game data.
 *
 * Provides safe get/set/remove operations with SSR support and error handling.
 * Also provides a versioned store factory for data that may need migrations.
 */

/**
 * Get a value from localStorage with a fallback.
 * Handles SSR (no window), parse errors, and missing keys.
 */
export function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Set a value in localStorage.
 * Handles SSR and quota exceeded errors silently.
 */
export function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeStored(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

/**
 * Configuration for a versioned store.
 */
export interface VersionedStoreConfig<T> {
  /** localStorage key */
  key: string;
  /** Current schema version */
  version: number;
  /** Default value when no data exists or data is invalid */
  defaults: T;
  /**
   * Optional migration functions keyed by version number.
   * Called when stored version < current version.
   * Each function receives the old data and returns migrated data.
   */
  migrations?: Record<number, (old: unknown) => Partial<T>>;
  /**
   * Optional validation function.
   * Return false if data is invalid and should reset to defaults.
   */
  validate?: (data: unknown) => boolean;
}

/**
 * A versioned store with load, save, and clear operations.
 */
export interface VersionedStore<T> {
  /** Load data from storage, applying migrations if needed */
  load: () => T;
  /** Save data to storage */
  save: (data: T) => void;
  /** Clear stored data */
  clear: () => void;
  /** Get the storage key (for debugging) */
  key: string;
}

/**
 * Create a versioned store for persisting typed data.
 *
 * Features:
 * - Automatic version checking
 * - Migration support for schema changes
 * - Validation to detect corrupted data
 * - Type-safe defaults
 *
 * @example
 * ```ts
 * interface Progress {
 *   version: number;
 *   currentLevel: number;
 *   completed: string[];
 * }
 *
 * const progressStore = createVersionedStore<Progress>({
 *   key: 'mygame_progress',
 *   version: 1,
 *   defaults: { version: 1, currentLevel: 1, completed: [] },
 * });
 *
 * const progress = progressStore.load();
 * progressStore.save({ ...progress, currentLevel: 2 });
 * ```
 */
export function createVersionedStore<T extends { version: number }>(
  config: VersionedStoreConfig<T>
): VersionedStore<T> {
  const { key, version, defaults, migrations, validate } = config;

  const load = (): T => {
    if (typeof window === 'undefined') return { ...defaults };

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...defaults };

      const parsed = JSON.parse(raw);

      // Check if data has a version field
      if (typeof parsed.version !== 'number') {
        console.warn(`[storage] ${key}: missing version, resetting to defaults`);
        return { ...defaults };
      }

      // Run validation if provided
      if (validate && !validate(parsed)) {
        console.warn(`[storage] ${key}: validation failed, resetting to defaults`);
        return { ...defaults };
      }

      // Apply migrations if needed
      let data = parsed;
      if (data.version < version && migrations) {
        for (let v = data.version + 1; v <= version; v++) {
          const migrate = migrations[v];
          if (migrate) {
            data = { ...data, ...migrate(data), version: v };
          } else {
            data = { ...data, version: v };
          }
        }
        // Save migrated data
        localStorage.setItem(key, JSON.stringify(data));
      }

      // If stored version is newer than code version, reset
      // (user downgraded? corrupted data?)
      if (data.version > version) {
        console.warn(`[storage] ${key}: future version ${data.version} > ${version}, resetting`);
        return { ...defaults };
      }

      return data as T;
    } catch (e) {
      console.warn(`[storage] ${key}: parse error, resetting to defaults`, e);
      return { ...defaults };
    }
  };

  const save = (data: T): void => {
    setStored(key, { ...data, version });
  };

  const clear = (): void => {
    removeStored(key);
  };

  return { load, save, clear, key };
}
