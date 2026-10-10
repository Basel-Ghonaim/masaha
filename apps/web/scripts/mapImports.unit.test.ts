import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// Leaflet is imported only by shared/map (docs/frontend/architecture.md §6), as eslint.config.js
// holds it, proven on probe files that exist only in memory.

const ROOT = resolve(import.meta.dirname, '../../..');
const eslint = new ESLint({ cwd: ROOT, overrideConfig: [tseslint.configs.disableTypeChecked] });

/** The import restriction's messages on a probe at `file`, from the repository's root. */
async function refusals(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(ROOT, file) });
  return (result?.messages ?? [])
    .filter(({ ruleId }) => ruleId === 'no-restricted-imports')
    .map(({ message }) => message);
}

const importing = (path: string) => `import * as probe from '${path}';\nexport { probe };\n`;

describe('the map libraries', { timeout: 60_000 }, () => {
  it.each(['leaflet', 'react-leaflet', '@react-leaflet/core'])(
    'refuses %s to a feature',
    async (library) => {
      expect(await refusals('apps/web/src/features/spaces/probe.ts', importing(library))).toEqual([
        expect.stringContaining('Only shared/map imports this package'),
      ]);
    },
  );

  it('allows them to shared/map', async () => {
    expect(
      await refusals(
        'apps/web/src/shared/map/components/probe.ts',
        `${importing('leaflet')}import * as other from 'react-leaflet';\nexport { other };\n`,
      ),
    ).toEqual([]);
  });

  it('still refuses shared/map the libraries only the design system imports', async () => {
    expect(
      await refusals('apps/web/src/shared/map/components/probe.ts', importing('radix-ui')),
    ).toEqual([expect.stringContaining('Only the design-system layer imports this package')]);
  });
});
