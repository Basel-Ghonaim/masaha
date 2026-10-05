import { pathToFileURL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';
import { DASHBOARD_CHUNK, isDashboardModule } from './scripts/dashboardOnly.ts';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The zone aliases (@app, @pages, @features, @shared) are defined in tsconfig.app.json;
  // tsconfig.json repeats @shared/* only for the shadcn CLI.
  // @masaha/shared is read from its source, as the API reads it, so it need not be built first; the
  // typecheck does the same through customConditions (tsconfig.app.json). Vite resolves for the
  // browser (the dev server, the build, the component lane) and as a server (the unit lane), and a
  // custom condition list replaces the defaults, so they are repeated after it.
  resolve: { tsconfigPaths: true, conditions: ['@masaha/source', ...defaultClientConditions] },
  ssr: { resolve: { conditions: ['@masaha/source', ...defaultServerConditions] } },
  build: {
    // The dashboard's own code is one chunk, loaded lazily when the dashboard opens (ADR 0011); what
    // it shares with the site stays out of it. The manifest lets check:build prove the site's first
    // download never reaches it.
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: DASHBOARD_CHUNK,
              test: isDashboardModule,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
  // One origin in development too (ADR 0014): the web on its fixed port, failing rather than moving
  // if the port is taken, and /api forwarded to the API on its own, so the cookies behave as online.
  server: {
    port: 5320,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3320' },
  },
  test: {
    // Every worker loads Vitest once, whatever the case of the drive letter it was started from
    // (finding 9).
    execArgv: ['--import', pathToFileURL(`${import.meta.dirname}/test/driveLetterHook.ts`).href],
    // One project per test lane (docs/development/testing.md); the file suffix picks the lane.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts', 'scripts/**/*.unit.test.ts'],
          // Vitest empties every CSS import, ?raw included, unless the file is listed here. The
          // token tests read the token files as text.
          css: { include: [/\/design-system\/tokens\/[^/?]+\.css\b/] },
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.component.test.tsx'],
          setupFiles: ['./src/test/componentSetup.ts'],
          // Each jsdom test is CPU-bound, and one worker per core left the machine no headroom: under
          // load, the overlay tests slowed past their timeout (finding 6). Half the cores keeps them
          // well inside it, at the same timeouts.
          maxWorkers: '50%',
        },
      },
    ],
  },
});
