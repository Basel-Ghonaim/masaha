import { prisma } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';

/** A key's hits in its current window, and when the window ends. */
export interface Count {
  hits: number;
  resetAt: Date;
}

/** Fixed-window counters in PostgreSQL, so every instance of the API shares them (ADR 0014). */
export interface Counter {
  /** Adds one hit and returns the new count. A key whose window has ended starts a new one. */
  hit(key: string, windowMs: number): Promise<Count>;
  /** The key's count in its current window, if it has one. Counts nothing. */
  peek(key: string): Promise<Count | undefined>;
}

interface Row {
  hits: number;
  reset_at: Date;
}

export function createCounter(db: PrismaClient = prisma): Counter {
  return {
    async hit(key, windowMs) {
      // One atomic statement, so concurrent hits are each counted once.
      const [row] = await db.$queryRaw<Row[]>`
        INSERT INTO rate_limits (key, hits, reset_at, updated_at)
        VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}), now())
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.hits + 1 END,
          reset_at = CASE
            WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at
            ELSE rate_limits.reset_at
          END,
          updated_at = now()
        RETURNING hits, reset_at`;
      if (!row) throw new Error(`The rate-limit counter returned no row for ${key}`);
      return { hits: row.hits, resetAt: row.reset_at };
    },

    async peek(key) {
      const [row] = await db.$queryRaw<Row[]>`
        SELECT hits, reset_at FROM rate_limits WHERE key = ${key} AND reset_at > now()`;
      return row && { hits: row.hits, resetAt: row.reset_at };
    },
  };
}
