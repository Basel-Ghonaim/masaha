import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.ts';

/** A Prisma client over its own PostgreSQL connection pool. */
export function createPrismaClient(connectionString: string | undefined) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// The one client the API uses. The pool connects lazily: server.ts validates DATABASE_URL, then
// checks the database is reachable, before anything queries it.
export const prisma = createPrismaClient(process.env.DATABASE_URL);
