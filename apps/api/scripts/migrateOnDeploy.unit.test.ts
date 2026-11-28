import { describe, expect, it } from 'vitest';

import {
  isConnectionFailure,
  migrateWithRetry,
  migrationStep,
  RETRY_WAITS_MS,
} from './migrateOnDeploy.ts';

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

describe('isConnectionFailure', () => {
  it('is true for P1001 and P1002 only', () => {
    expect(
      isConnectionFailure(
        "Error: P1001: Can't reach database server at `ep-x.eu-central-1.aws.neon.tech:5432`",
      ),
    ).toBe(true);
    expect(
      isConnectionFailure(
        "Error: P1002: Can't reach database server at `ep-x.eu-central-1.aws.neon.tech:5432`",
      ),
    ).toBe(true);
    expect(isConnectionFailure('Error: P3009: ...')).toBe(false);
    expect(isConnectionFailure('Error: P3018: ...')).toBe(false);
    expect(isConnectionFailure('')).toBe(false);
  });
});

describe('migrateWithRetry', () => {
  function harness(results: Array<{ ok: boolean; output: string }>) {
    const calls: Array<{ ok: boolean; output: string }> = [];
    const waits: number[] = [];
    const logLines: string[] = [];
    const run = () => {
      const result = results[calls.length] ?? { ok: false, output: '' };
      calls.push(result);
      return result;
    };
    const wait = (ms: number) => {
      waits.push(ms);
      return Promise.resolve();
    };
    const log = (line: string) => {
      logLines.push(line);
    };
    return { run, wait, log, calls, waits, logLines };
  }

  it('succeeds at the first attempt', async () => {
    const { run, wait, log, calls, waits, logLines } = harness([
      { ok: true, output: 'Applied migrations' },
    ]);
    expect(await migrateWithRetry(run, wait, log)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(waits).toEqual([]);
    expect(logLines).toEqual([]);
  });

  it('retries a P1001 once and then succeeds', async () => {
    const { run, wait, log, calls, waits, logLines } = harness([
      {
        ok: false,
        output:
          "Error: P1001: Can't reach database server at `ep-x.eu-central-1.aws.neon.tech:5432`",
      },
      { ok: true, output: 'Applied migrations' },
    ]);
    expect(await migrateWithRetry(run, wait, log)).toBe(true);
    expect(calls).toHaveLength(2);
    expect(waits).toEqual([5000]);
    expect(logLines).toEqual([
      "Can't reach the database (P1001); attempt 1 of 4 failed, retrying in 5 s.",
    ]);
  });

  it('fails after four P1001 attempts', async () => {
    const broken = {
      ok: false,
      output: "Error: P1001: Can't reach database server at `ep-x.eu-central-1.aws.neon.tech:5432`",
    };
    const { run, wait, log, calls, waits, logLines } = harness([broken, broken, broken, broken]);
    expect(await migrateWithRetry(run, wait, log)).toBe(false);
    expect(calls).toHaveLength(4);
    expect(waits).toEqual([...RETRY_WAITS_MS]);
    expect(logLines).toHaveLength(4);
    expect(logLines[logLines.length - 1]).toBe(
      "Can't reach the database (P1001) after 4 attempts; the deploy fails.",
    );
  });

  it('fails at once for a non-connection failure such as P3018', async () => {
    const { run, wait, log, calls, waits, logLines } = harness([
      { ok: false, output: 'Error: P3018: ...' },
    ]);
    expect(await migrateWithRetry(run, wait, log)).toBe(false);
    expect(calls).toHaveLength(1);
    expect(waits).toEqual([]);
    expect(logLines).toEqual([]);
  });

  it('never logs the output, a URL or an environment value', async () => {
    const { run, wait, log, logLines } = harness([
      {
        ok: false,
        output:
          "Error: P1001: Can't reach database server at `ep-x.eu-central-1.aws.neon.tech:5432` (secret in output)",
      },
      { ok: true, output: 'Applied migrations' },
    ]);
    expect(await migrateWithRetry(run, wait, log)).toBe(true);
    for (const line of logLines) {
      expect(line).not.toContain('neon.tech');
      expect(line).not.toContain('secret');
    }
  });
});
