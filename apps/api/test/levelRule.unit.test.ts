import { resolve } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// The level rules of eslint.config.js, the API's (docs/backend/conventions.md §7) and the shared
// package's (docs/architecture/shared-package.md, R3), proven on probe files that exist only in
// memory: each imports real files, from a path that gives the probe its element. Type-aware rules are
// switched off, since a probe belongs to no TypeScript project.

const ROOT = resolve(import.meta.dirname, '../../..');
const eslint = new ESLint({ cwd: ROOT, overrideConfig: [tseslint.configs.disableTypeChecked] });

/**
 * The level rules' verdicts on a probe at `file`, from the repository's root, with `code`:
 * "from → to (path)" each, or "from → @masaha/shared/…" for an import of the shared package.
 */
async function verdicts(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(ROOT, file) });
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
    [
      'a shared capability at a higher level',
      'src/modules/users/probe.ts',
      '@masaha/shared/auth',
      'L1 → @masaha/shared/auth',
    ],
    [
      'a shared capability, from shared/',
      'src/shared/http/probe.ts',
      '@masaha/shared/auth',
      'platform → @masaha/shared/auth',
    ],
    [
      'a shared capability, from db',
      'src/db/probe.ts',
      '@masaha/shared/users',
      'infrastructure → @masaha/shared/users',
    ],
    [
      'the shared core, from a module missing from the level map',
      'src/modules/widgets/probe.ts',
      '@masaha/shared/core',
      'unplaced → @masaha/shared/core',
    ],
    [
      'a path past a shared capability',
      'src/modules/auth/probe.ts',
      '@masaha/shared/users/requests',
      'L3 → @masaha/shared/users/requests',
    ],
    [
      'the shared package itself, from the root',
      'src/probe.ts',
      '@masaha/shared',
      'root → @masaha/shared',
    ],
  ])('refuses %s', async (_case, file, path, verdict) => {
    expect(await verdicts(`apps/api/${file}`, importing(path))).toEqual([verdict]);
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
    ['a shared capability at a lower level', 'src/modules/auth/probe.ts', '@masaha/shared/users'],
    ['a shared capability at its own level', 'src/modules/users/probe.ts', '@masaha/shared/users'],
    ['the shared core, from a module', 'src/modules/sessions/probe.ts', '@masaha/shared/core'],
    ['the shared core, from shared/', 'src/shared/http/probe.ts', '@masaha/shared/core'],
    ['the shared core, from db', 'src/db/probe.ts', '@masaha/shared/core'],
    ['a shared capability, from the seed', 'src/db/seed/probe.ts', '@masaha/shared/lookups'],
  ])('allows %s', async (_case, file, path) => {
    expect(await verdicts(`apps/api/${file}`, importing(path))).toEqual([]);
  });
});

describe("the shared package's level rule", { timeout: 60_000 }, () => {
  it.each([
    ['a capability, from core', 'core/probe.ts', '../users/index.ts', 'core → L1 (index.ts)'],
    ['a higher level', 'users/probe.ts', '../auth/index.ts', 'L1 → L3 (index.ts)'],
    [
      'a file past an index.ts',
      'auth/probe.ts',
      '../users/passwordPolicy.ts',
      'L3 → L1 (passwordPolicy.ts)',
    ],
    [
      'from a folder missing from the level map',
      'unplaced/probe.ts',
      '../core/index.ts',
      'unplaced → core (index.ts)',
    ],
    ['from a file placed in src/', 'probe.ts', './auth/index.ts', 'unplaced → L3 (index.ts)'],
    [
      'its own name, even for a lower level',
      'auth/probe.ts',
      '@masaha/shared/users',
      'L3 → @masaha/shared/users',
    ],
    ['a package other than zod, from core', 'core/probe.ts', 'axios', 'core → axios'],
  ])('refuses %s', async (_case, file, path, verdict) => {
    expect(await verdicts(`packages/shared/src/${file}`, importing(path))).toEqual([verdict]);
  });

  it.each([
    ['a lower level, through its index.ts', 'auth/probe.ts', '../users/index.ts'],
    ['core, through its index.ts', 'users/probe.ts', '../core/index.ts'],
    ['zod, from core', 'core/probe.ts', 'zod'],
    ['its test runner, from a test of core', 'core/probe.unit.test.ts', 'vitest'],
  ])('allows %s', async (_case, file, path) => {
    expect(await verdicts(`packages/shared/src/${file}`, importing(path))).toEqual([]);
  });
});
