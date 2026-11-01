import { prisma } from '../../db/index.ts';
import type { PrismaClient } from '../../generated/prisma/client.ts';
import { SWEEP_BATCH } from '../jobs/index.ts';

/** A key's hits in its current window, and when the window ends. */
export interface Count {
  hits: number;
  resetAt: Date;
}

/** Fixed-window counters in PostgreSQL, so every instance of the API shares them (ADR 0014). */
export interface Counter {
  /**
   * Adds one hit at `now` and returns the new count. A key whose window has ended starts a new one.
   * The time is the API's clock, never the database's, so a window and its Retry-After agree.
   */
  hit(key: string, windowMs: number, now: Date): Promise<Count>;
  /** Gives back one hit, only within the window `count` was taken in: never into the next one. */
  refund(key: string, count: Count): Promise<void>;
}

interface Row {
  hits: number;
  reset_at: Date;
}

/**
 * Deletes the counters whose window has ended by `now`, at most `SWEEP_BATCH`, the earliest ended
 * first: a key hit again starts a new window anyway, so an ended row only takes room (finding 17).
 * The window's end is checked again on the row deleted, so a hit that has just started a new
 * window keeps it. How many it deleted.
 */
export function sweepEndedWindows(now: Date, db: PrismaClient = prisma): Promise<number> {
  return db.$executeRaw`
    DELETE FROM rate_limits
    WHERE reset_at <= ${now} AND key IN (
      SELECT key FROM rate_limits WHERE reset_at <= ${now} ORDER BY reset_at, key LIMIT ${SWEEP_BATCH}
    )`;
}

export function createCounter(db: PrismaClient = prisma): Counter {
  return {
    async hit(key, windowMs, now) {
      const resetAt = new Date(now.getTime() + windowMs);
      // One atomic statement, so concurrent hits are each counted once.
      const [row] = await db.$queryRaw<Row[]>`
        INSERT INTO rate_limits (key, hits, reset_at, updated_at)
        VALUES (${key}, 1, ${resetAt}, ${now})
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE WHEN rate_limits.reset_at <= ${now} THEN 1 ELSE rate_limits.hits + 1 END,
          reset_at = CASE
            WHEN rate_limits.reset_at <= ${now} THEN EXCLUDED.reset_at
            ELSE rate_limits.reset_at
          END,
          updated_at = ${now}
        RETURNING hits, reset_at`;
      if (!row) throw new Error(`The rate-limit counter returned no row for ${key}`);
      return { hits: row.hits, resetAt: row.reset_at };
    },

    async refund(key, { resetAt }) {
      await db.$executeRaw`
        UPDATE rate_limits SET hits = hits - 1
        WHERE key = ${key} AND reset_at = ${resetAt} AND hits > 0`;
    },
  };
}
