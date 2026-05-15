/**
 * Generic Catalog Service Factory
 *
 * Creates an ordered content catalog with navigation.
 * Games configure with their own entry type and fetch logic.
 *
 * Usage:
 *   const catalog = createCatalogService<ChapterEntry>({
 *     fetchIndex: () => fetch('/api/chapters').then(r => r.json()),
 *     fallbackEntries: [{ id: 'fallback', url: 'default.json' }],
 *   });
 *   await catalog.init();
 *   catalog.current();
 *   catalog.next();
 */

export interface CatalogEntry {
  /** Unique identifier */
  id: string;
}

export interface CatalogServiceConfig<T extends CatalogEntry> {
  /** Fetch the index of entries */
  fetchIndex: () => Promise<T[]>;
  /** Fallback entries if fetch fails */
  fallbackEntries: T[];
}

export interface CatalogService<T extends CatalogEntry> {
  /** Initialize by fetching the index */
  init: () => Promise<void>;
  /** Get all entries */
  entries: () => T[];
  /** Get current entry */
  current: () => T | null;
  /** Get current index */
  currentIndex: () => number;
  /** Set current index */
  setIndex: (index: number) => void;
  /** Check if there's a next entry */
  hasNext: () => boolean;
  /** Advance to next and return it */
  next: () => T | null;
  /** Find entry index by id */
  findById: (id: string) => number;
}

export function createCatalogService<T extends CatalogEntry>(
  config: CatalogServiceConfig<T>
): CatalogService<T> {
  let items: T[] = [];
  let index = 0;

  return {
    async init() {
      try {
        items = await config.fetchIndex();
      } catch {
        items = config.fallbackEntries;
      }
      index = 0;
    },
    entries: () => items,
    current: () => items[index] ?? null,
    currentIndex: () => index,
    setIndex(i: number) {
      index = Math.max(0, Math.min(i, items.length - 1));
    },
    hasNext: () => index < items.length - 1,
    next() {
      if (index >= items.length - 1) return null;
      index++;
      return items[index];
    },
    findById(id: string) {
      return items.findIndex((e) => e.id === id);
    },
  };
}
