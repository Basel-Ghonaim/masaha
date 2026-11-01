import type request from 'supertest';

import { prisma, type Tx } from '../src/db/index.ts';

// The races of conventions §13, as the API tests run them: a test transaction takes the rows
// another change would hold, a request starts and waits on them, the transaction writes what that
// change would, and commits. The request must then decide on what was committed.

/**
 * How long a request may take to reach the lock it waits on, bcrypt included: well under a race
 * test's own timeout, so a slow machine fails the reach, never the test's limit (finding 77).
 */
const REACH_MS = 8_000;
const POLL_MS = 20;

/** A race test's own timeout, `it(title, fn, RACE_TIMEOUT_MS)`: the reach sits well under it. */
export const RACE_TIMEOUT_MS = 20_000;
/** How long a race's holding transaction may last: past the reach, under the test's own limit. */
const HOLD_MS = 15_000;

/**
 * Waits until `count` backends of the test database wait on a lock of the table `on` — the
 * requests a race test started, blocked on what its transaction holds — and answers their process
 * ids, smallest first. A backend counts when it waits on the table's own lock, holds its row's
 * tuple lock while it waits for the transaction that holds the row (a row's first waiter), or
 * awaits another transaction while writing the table, holding no row's lock (a unique key's second
 * writer). A backend waiting on any other table never counts, so a race whose own request never
 * reached its lock fails instead of passing on another's wait (findings 52, 77). Fails after
 * REACH_MS.
 */
export async function waitingOnLock({
  count = 1,
  on,
}: {
  count?: number;
  on: string;
}): Promise<number[]> {
  const deadline = Date.now() + REACH_MS;
  for (;;) {
    // Each poll is its own statement on the default client, so its own statistics snapshot.
    const rows = await prisma.$queryRaw<{ pid: number }[]>`
      SELECT DISTINCT activity.pid FROM pg_stat_activity AS activity
      JOIN pg_locks AS held ON held.pid = activity.pid
      WHERE activity.datname = current_database() AND activity.wait_event_type = 'Lock'
        AND held.relation = to_regclass(${on})
        AND (
          NOT held.granted
          OR held.locktype = 'tuple'
          -- A unique key's second writer: it awaits the first's transaction while writing the table.
          OR (
            held.mode = 'RowExclusiveLock'
            AND EXISTS (
              SELECT 1 FROM pg_locks AS awaited
              WHERE awaited.pid = activity.pid AND awaited.locktype = 'transactionid'
                AND NOT awaited.granted
            )
            AND NOT EXISTS (
              SELECT 1 FROM pg_locks AS row_lock
              WHERE row_lock.pid = activity.pid AND row_lock.locktype = 'tuple'
            )
          )
        )
      ORDER BY activity.pid`;
    if (rows.length >= count) return rows.map(({ pid }) => pid);
    if (Date.now() > deadline) {
      throw new Error(`${String(count)} request(s) never waited on a lock of ${on}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/** Locks these users' rows, by id, as a transaction holding their session locks does. */
export async function lockUsers(tx: Tx, ...ids: number[]): Promise<void> {
  const sorted = [...ids].sort((a, b) => a - b);
  for (const id of sorted) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  }
}

/**
 * Starts `call` once `hold` has taken its locks, waits until the request waits on a lock of the
 * table `on`, runs `meanwhile` in the same transaction, commits, then returns the request's answer.
 */
export async function whileHeld(
  on: string,
  hold: (tx: Tx) => Promise<unknown>,
  call: () => PromiseLike<request.Response>,
  meanwhile: (tx: Tx) => Promise<unknown>,
): Promise<request.Response> {
  let answer: Promise<request.Response> | undefined;
  await prisma.$transaction(
    async (tx) => {
      await hold(tx);
      answer = Promise.resolve(call());
      await waitingOnLock({ on });
      await meanwhile(tx);
    },
    { timeout: HOLD_MS },
  );
  if (!answer) throw new Error('The request never started');
  return answer;
}
