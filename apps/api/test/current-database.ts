import type { PrismaClient } from '../src/generated/prisma/client.ts';

/** The name of the database `db` is connected to. */
export async function currentDatabase(db: PrismaClient): Promise<string> {
  const rows = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  const [row] = rows;
  if (!row) throw new Error('current_database() returned no row');
  return row.name;
}
