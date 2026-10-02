import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// The module level rule of eslint.config.js (docs/backend/conventions.md §7), proven on probe files
// that exist only in memory: each imports real files of the API, from a path that gives the probe
// its element. Type-aware rules are switched off, since a probe belongs to no TypeScript project.

const ROOT = resolve(import.meta.dirname, '../../..');
const eslint = new ESLint({ cwd: ROOT, overrideConfig: [tseslint.configs.disableTypeChecked] });

/** The level rule's verdicts on a probe at `file` with `code`: "from → to (path)" each. */
async function verdicts(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(ROOT, 'apps/api', file) });
  return (result?.messages ?? [])
    .filter(({ ruleId }) => ruleId === 'boundaries/dependencies')
    .map(({ message }) => message.slice(0, message.indexOf(' is not allowed')));
}

const importing = (path: string) => `import * as probe from '${path}';\nexport { probe };\n`;

describe('the module level rule', { timeout: 60_000 }, () => {
  it.each([
    ['a higher level', 'src/modules/sessions/probe.ts', '../users/index.ts', 'L0 → L1 (index.ts)'],
    [
      'a file past an index.ts',
      'src/modules/users/probe.ts',
      '../sessions/sessions.service.ts',
      'L1 → L0 (sessions.service.ts)',
    ],
    [
      'the same level',
      'src/modules/lookups/probe.ts',
      '../sessions/index.ts',
      'L0 → L0 (index.ts)',
    ],
    [
      'from a file placed in modules/',
      'src/modules/probe.ts',
      './sessions/index.ts',
      'unplaced → L0 (index.ts)',
    ],
    [
      'from shared/',
      'src/shared/http/probe.ts',
      '../../modules/users/index.ts',
      'platform → L1 (index.ts)',
    ],
    ['from db', 'src/db/probe.ts', '../modules/users/index.ts', 'infrastructure → L1 (index.ts)'],
    [
      'the root, from a module',
      'src/modules/sessions/probe.ts',
      '../../app.ts',
      'L0 → root (app.ts)',
    ],
    [
      'the root, from shared/',
      'src/shared/http/probe.ts',
      '../../app.ts',
      'platform → root (app.ts)',
    ],
    [
      'the test helpers, from a module',
      'src/modules/sessions/probe.ts',
      '../../../test/app.ts',
      'L0 → root (app.ts)',
    ],
    [
      "past db's index.ts, from a module",
      'src/modules/sessions/probe.ts',
      '../../db/prisma.ts',
      'L0 → infrastructure (prisma.ts)',
    ],
    [
      "past a module's index.ts, from the root",
      'src/probe.ts',
      './modules/sessions/tokens.ts',
      'root → L0 (tokens.ts)',
    ],
  ])('refuses %s', async (_case, file, path, verdict) => {
    expect(await verdicts(file, importing(path))).toEqual([verdict]);
  });

  it.each([
    ['a lower level, through its index.ts', 'src/modules/auth/probe.ts', '../users/index.ts'],
    [
      'db, through its index.ts, from a module',
      'src/modules/sessions/probe.ts',
      '../../db/index.ts',
    ],
    ['any module, from the root', 'src/probe.ts', './modules/auth/index.ts'],
    ['users, from the seed', 'src/db/seed/probe.ts', '../../modules/users/index.ts'],
    ['the root, from a test', 'src/modules/sessions/probe.api.test.ts', '../../../test/app.ts'],
  ])('allows %s', async (_case, file, path) => {
    expect(await verdicts(file, importing(path))).toEqual([]);
  });
});
