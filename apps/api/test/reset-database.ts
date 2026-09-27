import type { PrismaClient } from '../src/generated/prisma/client.ts';

import { assertTestDatabase } from './assert-test-database.ts';
import { currentDatabase } from './current-database.ts';

/**
 * Empties every table in the test database except Prisma's migration history, and restarts the
 * ID sequences. Refuses to run on any database whose name does not end in _test.
 */
export async function resetDatabase(db: PrismaClient): Promise<void> {
  assertTestDatabase(await currentDatabase(db));

  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  const list = tables.map(({ name }) => `"public"."${name.replaceAll('"', '""')}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
