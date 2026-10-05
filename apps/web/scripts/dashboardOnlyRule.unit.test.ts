import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// The dashboard-only rule of eslint.config.js (docs/frontend/architecture.md §3), proven on probe
// files that exist only in memory: each imports a real module, from a path that places the probe in
// a page group. Type-aware rules are switched off, since a probe belongs to no TypeScript project.

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
const lazilyImporting = (path: string) => `export const probe = () => import('${path}');\n`;

const SITE = 'apps/web/src/pages/site/probe.ts';
const DASHBOARD = 'apps/web/src/pages/dashboard/probe.ts';

describe('the dashboard-only rule', { timeout: 60_000 }, () => {
  it('refuses the site a dashboard-only capability', async () => {
    expect(await verdicts(SITE, importing('@features/space-links'))).toEqual([
      'site → space-links',
    ]);
  });

  it('refuses the site a dashboard-only capability imported lazily', async () => {
    expect(await verdicts(SITE, lazilyImporting('@features/space-links'))).toEqual([
      'site → space-links',
    ]);
  });

  it('refuses the site the dashboard group itself', async () => {
    expect(await verdicts(SITE, importing('@pages/dashboard'))).toEqual(['page → page (index.ts)']);
  });

  it('allows the site a capability any page group may import', async () => {
    expect(await verdicts(SITE, importing('@features/users'))).toEqual([]);
  });

  it('allows the dashboard a dashboard-only capability', async () => {
    expect(await verdicts(DASHBOARD, importing('@features/space-links'))).toEqual([]);
  });
});
