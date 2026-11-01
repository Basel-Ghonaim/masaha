import { describe, expect, it } from 'vitest';

import { migrationStep } from './migrateOnDeploy.ts';

const POOLED = 'postgresql://app:secret@ep-x-pooler.eu-central-1.aws.neon.tech/masaha';
const DIRECT = 'postgresql://app:secret@ep-x.eu-central-1.aws.neon.tech/masaha';

describe('migrationStep', () => {
  it('migrates only a production deploy, over the direct connection', () => {
    const step = migrationStep({
      VERCEL_ENV: 'production',
      DATABASE_URL: POOLED,
      DIRECT_URL: DIRECT,
    });

    expect(step.kind).toBe('migrate');
    // Prisma reads DATABASE_URL (prisma.config.ts): the pooled one is replaced for this run only.
    expect(step.kind === 'migrate' && step.env.DATABASE_URL).toBe(DIRECT);
  });

  it.each([['preview'], ['development'], [undefined]])(
    'leaves the database alone on any other build (VERCEL_ENV=%s)',
    (vercelEnv) => {
      const step = migrationStep({ VERCEL_ENV: vercelEnv, DIRECT_URL: DIRECT });

      expect(step.kind).toBe('skip');
    },
  );

  it('fails a production deploy that has no direct connection, rather than migrate the pooled one', () => {
    const step = migrationStep({ VERCEL_ENV: 'production', DATABASE_URL: POOLED });

    expect(step.kind).toBe('fail');
    expect(step.kind === 'fail' && step.message).toContain('DIRECT_URL');
    expect(step.kind === 'fail' && step.message).not.toContain('secret');
  });
});
