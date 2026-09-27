import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests read @masaha/shared from its source (see tsconfig.json). Vitest resolves as a server; a
  // custom condition list replaces the server defaults, so they are repeated after it.
  ssr: {
    resolve: { conditions: ['@masaha/source', 'module', 'node', 'development|production'] },
  },
  test: {
    // One project per test lane (docs/development/testing.md); the file suffix picks the lane.
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.unit.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'api', environment: 'node', include: ['src/**/*.api.test.ts'] },
      },
    ],
  },
});
