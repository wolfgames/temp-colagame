import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/app.tsx',
    'src/core/index.ts',
    'src/game/index.ts',
    'scripts/*.ts',
    'tests/**/*.test.ts',
    'tests/**/*.spec.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    // Modules are template building blocks — games pick what they need
    'src/modules/**',
  ],
  ignoreDependencies: [
    // Used by scripts/build-index.ts and query-index.ts (dynamic)
    '@wolfgames/semantic-router',
    '@xenova/transformers',
  ],
};

export default config;
