/**
 * Generic Content Loader Factory
 *
 * Creates a typed fetch + transform pipeline.
 * Games configure with their own source/target types.
 *
 * Usage:
 *   const loader = createContentLoader<ChapterRef, LevelManifest>({
 *     fetch: (url) => fetch(url).then(r => r.json()),
 *     transform: (raw) => convertToLevelManifest(raw),
 *   });
 *   const level = await loader.load('/api/chapters/1');
 */

export interface ContentLoaderConfig<TSource, TTarget> {
  /** Fetch raw data from a URL */
  fetch: (url: string) => Promise<TSource>;
  /** Transform raw data into the target type */
  transform?: (source: TSource) => TTarget;
}

export interface ContentLoader<TTarget> {
  /** Load and optionally transform content from a URL */
  load: (url: string) => Promise<TTarget>;
}

export function createContentLoader<TSource, TTarget = TSource>(
  config: ContentLoaderConfig<TSource, TTarget>
): ContentLoader<TTarget> {
  return {
    async load(url: string): Promise<TTarget> {
      const raw = await config.fetch(url);
      if (config.transform) {
        return config.transform(raw);
      }
      return raw as unknown as TTarget;
    },
  };
}
