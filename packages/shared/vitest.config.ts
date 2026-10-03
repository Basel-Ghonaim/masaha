import { pathToFileURL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The drive-letter hook of finding 9, shared with the API's lanes rather than copied a third time.
    execArgv: [
      '--import',
      pathToFileURL(`${import.meta.dirname}/../../apps/api/test/drive-letter-hook.ts`).href,
    ],
    // The unit lane (docs/development/testing.md): the shared schemas depend on their inputs only.
    include: ['src/**/*.unit.test.ts'],
    environment: 'node',
  },
});
