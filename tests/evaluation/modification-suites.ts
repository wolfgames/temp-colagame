/**
 * Maps scaffold modification identifiers to the tests that evaluate them.
 * Add an entry when introducing a new modification type; tests use tags or
 * file names that match the selector used here.
 */

export interface ModificationSuite {
  id: string;
  description: string;
  /** Playwright grep pattern (e.g. @unload-bundles) or project name */
  grep: string;
}

export const MODIFICATION_SUITES: ModificationSuite[] = [
  {
    id: 'smoke',
    description: 'Scaffold smoke: app loads, screens visible, no crash',
    grep: '@smoke',
  },
  {
    id: 'unload-bundles',
    description:
      'Unloading bundles: unloadBundle(name) and unloadScene(name) at coordinator; Pixi/DOM/Audio loaders unload resources',
    grep: '@unload-bundles',
  },
];

export function getModificationSuite(id: string): ModificationSuite | undefined {
  return MODIFICATION_SUITES.find((s) => s.id === id);
}

export function listModificationIds(): string[] {
  return MODIFICATION_SUITES.map((s) => s.id);
}
