import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // One project per test lane (docs/development/testing.md); the file suffix picks the lane.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts'],
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
