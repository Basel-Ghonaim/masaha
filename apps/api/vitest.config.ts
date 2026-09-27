import { existsSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

// The API lane reads TEST_DATABASE_URL from apps/api/.env, loaded by Node as the API does (CI sets
// it in the environment instead, which takes precedence).
const envFile = `${import.meta.dirname}/.env`;
if (existsSync(envFile)) process.loadEnvFile(envFile);

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
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts', 'test/**/*.unit.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          include: ['src/**/*.api.test.ts'],
          // The lane's code, including the Prisma singleton, talks to the test database only.
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
          globalSetup: ['test/global-setup.ts'],
          setupFiles: ['test/setup.ts'],
          // Files share one database and each starts by emptying it, so they run one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
