import { execSync } from 'node:child_process';
import { join } from 'node:path';

// The deployment's migration step (docs/development/setup.md, The deployment), run by vercel.json's
// buildCommand once the build has succeeded. Only a production deploy migrates, and it does so over
// Neon's direct connection, DIRECT_URL: the app keeps the pooled DATABASE_URL, whose transaction
// pooling migrations do not support. Prisma reads DATABASE_URL (prisma.config.ts), so the migration's
// own process gets the direct URL under that name; nothing else changes. A failed migration exits
// non-zero, which fails the deploy. Locally and in CI this never runs: the lanes migrate their own
// databases.

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

function main() {
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
  try {
    execSync('npx prisma migrate deploy', {
      cwd: join(import.meta.dirname, '..'),
      env: step.env,
      stdio: 'inherit',
    });
  } catch {
    // Prisma has printed why; the deploy fails with it.
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main();
}
