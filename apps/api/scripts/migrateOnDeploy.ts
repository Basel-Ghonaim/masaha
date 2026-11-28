import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// The deployment's migration step (docs/development/setup.md, The deployment), run by vercel.json's
// buildCommand once the build has succeeded. Only a production deploy migrates, and it does so over
// Neon's direct connection, DIRECT_URL: the app keeps the pooled DATABASE_URL, whose transaction
// pooling migrations do not support. Prisma reads DATABASE_URL (prisma.config.ts), so the migration's
// own process gets the direct URL under that name; nothing else changes. A failed migration exits
// non-zero, which fails the deploy. A database connection failure (Prisma's P1001 or P1002) is
// retried — four attempts in all, with waits of 5, 10 and 20 seconds; any other failure fails the
// deploy at once. Locally and in CI this never runs: the lanes migrate their own databases.

export type MigrationStep =
  | { kind: 'skip'; message: string }
  | { kind: 'fail'; message: string }
  | { kind: 'migrate'; env: NodeJS.ProcessEnv };

/** What this build does to the database, from its environment. Never names a URL's value. */
export function migrationStep(env: NodeJS.ProcessEnv): MigrationStep {
  if (env.VERCEL_ENV !== 'production') {
    return {
      kind: 'skip',
      message: `Not a production deploy (VERCEL_ENV=${env.VERCEL_ENV ?? 'unset'}): no migration.`,
    };
  }
  if (!env.DIRECT_URL) {
    return {
      kind: 'fail',
      message:
        "DIRECT_URL is not set: a production deploy migrates over Neon's direct connection, never the pooled DATABASE_URL.",
    };
  }
  return { kind: 'migrate', env: { ...env, DATABASE_URL: env.DIRECT_URL } };
}

/** Prisma's connection-failure codes, matched as whole words: P1001 and P1002 only. */
const CONNECTION_FAILURE_CODES = /\bP100[12]\b/;

/** True when Prisma's output names a connection failure (P1001 or P1002). */
export function isConnectionFailure(output: string): boolean {
  return CONNECTION_FAILURE_CODES.test(output);
}

/** The waits between migration attempts, in milliseconds. Read-only: four attempts in all. */
export const RETRY_WAITS_MS: readonly number[] = [5_000, 10_000, 20_000];

/**
 * Runs `run` until a migration attempt succeeds, retrying only connection failures.
 * Returns `true` when an attempt succeeded, `false` otherwise. The log lines never name the
 * output, a URL or any environment value. Tests pass a fake `wait` that resolves at once.
 */
export async function migrateWithRetry(
  run: () => { ok: boolean; output: string },
  wait: (ms: number) => Promise<void>,
  log: (line: string) => void,
): Promise<boolean> {
  const attempts = RETRY_WAITS_MS.length + 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = run();
    if (result.ok) return true;
    if (!isConnectionFailure(result.output)) return false;
    const matched = result.output.match(CONNECTION_FAILURE_CODES);
    const code = matched ? matched[0] : '';
    const waitMs = RETRY_WAITS_MS[attempt - 1];
    if (waitMs === undefined) {
      log(
        `Can't reach the database (${code}) after ${String(attempts)} attempts; the deploy fails.`,
      );
      return false;
    }
    log(
      `Can't reach the database (${code}); attempt ${String(attempt)} of ${String(attempts)} failed, retrying in ${String(waitMs / 1000)} s.`,
    );
    await wait(waitMs);
  }
  return false;
}

/** One `npx prisma migrate deploy` attempt; writes its output to the build log in full. */
function runMigration(env: NodeJS.ProcessEnv): { ok: boolean; output: string } {
  const result = spawnSync('npx prisma migrate deploy', {
    cwd: join(import.meta.dirname, '..'),
    env,
    encoding: 'utf8',
    shell: true,
  });
  const stdout = result.stdout;
  const stderr = result.stderr;
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return { ok: result.status === 0, output: stdout + stderr };
}

async function main() {
  const step = migrationStep(process.env);
  if (step.kind === 'skip') {
    console.log(step.message);
    return;
  }
  if (step.kind === 'fail') {
    console.error(step.message);
    process.exitCode = 1;
    return;
  }
  const ok = await migrateWithRetry(
    () => runMigration(step.env),
    (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    console.error,
  );
  if (!ok) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
