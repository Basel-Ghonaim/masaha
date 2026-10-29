import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// A capability's public entry in eslint.config.js (docs/frontend/architecture.md §3, finding 180),
// proven on probe files that exist only in memory, as the dashboard-only rule's test does.
// Type-aware rules are switched off, since a probe belongs to no TypeScript project.

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

const SITE = 'apps/web/src/pages/site/probe.ts';
const DASHBOARD = 'apps/web/src/pages/dashboard/probe.ts';

describe("a capability's public entry", { timeout: 60_000 }, () => {
  it('allows the site a capability through its public entry', async () => {
    expect(await verdicts(SITE, importing('@features/data-reports/public'))).toEqual([]);
  });

  it("refuses the site a capability's index when the capability has a public entry", async () => {
    expect(await verdicts(SITE, importing('@features/announcements'))).toEqual([
      'site → announcements (index.ts)',
    ]);
  });

  it('allows the site the index of a capability with no public entry', async () => {
    expect(await verdicts(SITE, importing('@features/directory'))).toEqual([]);
  });

  it("allows the dashboard a capability's index beside its public entry", async () => {
    expect(await verdicts(DASHBOARD, importing('@features/data-reports'))).toEqual([]);
  });

  it('still refuses a file inside the capability', async () => {
    expect(
      await verdicts(SITE, importing('@features/data-reports/components/report/ReportAction')),
    ).toEqual(['page → feature (components/report/ReportAction.tsx)']);
  });
});
