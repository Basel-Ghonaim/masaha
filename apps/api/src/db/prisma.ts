import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.ts';

// An unreachable host fails within this time instead of hanging /health and startup.
const CONNECTION_TIMEOUT_MS = 2_000;

/** A Prisma client over its own PostgreSQL connection pool. */
export function createPrismaClient(connectionString: string | undefined) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS }),
  });
}

/** Whether `db` can run a query right now. */
export async function isDatabaseUp(db: PrismaClient): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// The one client the API uses. The pool connects lazily: server.ts validates DATABASE_URL, then
// checks the database is reachable, before anything queries it.
export const prisma = createPrismaClient(process.env.DATABASE_URL);
