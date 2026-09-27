import { execSync } from 'node:child_process';

import { createPrismaClient } from '../src/db/index.ts';
import { assertTestDatabase } from './assert-test-database.ts';
import { currentDatabase } from './current-database.ts';

/** Runs once before the API lane: checks the test database, then applies every migration to it. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy it from apps/api/.env.example into apps/api/.env.',
    );
  }

  const db = createPrismaClient(url);
  let name: string;
  try {
    name = await currentDatabase(db);
  } catch (error) {
    throw new Error(
      'Cannot reach the test database (TEST_DATABASE_URL). Is PostgreSQL running? Start it with ' +
        '`npm run db:up`.',
      { cause: error },
    );
  } finally {
    await db.$disconnect();
  }
  assertTestDatabase(name);

  execSync('npx prisma migrate deploy', {
    cwd: import.meta.dirname + '/..',
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
