import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The zone aliases (@app, @pages, @features, @shared) are defined in tsconfig.app.json;
  // tsconfig.json repeats @shared/* only for the shadcn CLI.
  resolve: { tsconfigPaths: true },
  test: {
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
        },
      },
    ],
  },
});
