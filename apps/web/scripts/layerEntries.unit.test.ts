import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// The design-system layer's public entries in eslint.config.js (docs/frontend/design-system/
// foundation.md §3), proven on probe files that exist only in memory, as the dashboard-only rule's
// test does. Type-aware rules are switched off, since a probe belongs to no TypeScript project.

const ROOT = resolve(import.meta.dirname, '../../..');
const eslint = new ESLint({ cwd: ROOT, overrideConfig: [tseslint.configs.disableTypeChecked] });

/** The zone rule's verdicts on a probe at `file`, from the repository's root, with `code`. */
async function verdicts(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(ROOT, file) });
  return (result?.messages ?? [])
    .filter(({ ruleId }) => ruleId === 'boundaries/dependencies')
    .map(({ message }) => message.slice(0, message.indexOf(' is not allowed')));
}

const importing = (path: string) => `import * as probe from '${path}';\nexport { probe };\n`;

const FEATURE = 'apps/web/src/features/space-links/probe.ts';

describe("the design-system layer's entries", { timeout: 60_000 }, () => {
  it('allows its data components through their own entry', async () => {
    expect(await verdicts(FEATURE, importing('@shared/design-system/data'))).toEqual([]);
  });

  it('still refuses a file inside the layer', async () => {
    expect(
      await verdicts(FEATURE, importing('@shared/design-system/components/data/DataTable')),
    ).toEqual(['feature → design-system (components/data/DataTable/index.ts)']);
  });
});
