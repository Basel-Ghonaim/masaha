import type request from 'supertest';

import { prisma, type Tx } from '../src/db/index.ts';

// The races of conventions §13, as the API tests run them: a test transaction takes the rows
// another change would hold, a request starts and waits on them, the transaction writes what that
// change would, and commits. The request must then decide on what was committed.

/** How long a request may take to reach the lock it waits on, bcrypt included; under Vitest's 5 s. */
const REACH_MS = 4_000;
const POLL_MS = 20;

/**
 * Waits until `count` backends of the test database wait on a lock — the requests a race test
 * started, blocked on what its transaction holds — and answers their process ids, smallest first.
 * With `on`, only those waiting for that table's lock. Fails after REACH_MS, so a race whose request
 * never reached the lock fails instead of passing without interleaving (finding 52).
 */
export async function waitingOnLock({
  count = 1,
  on,
}: { count?: number; on?: string } = {}): Promise<number[]> {
  const deadline = Date.now() + REACH_MS;
  for (;;) {
    // Each poll is its own statement on the default client, so its own statistics snapshot.
    const rows =
      on === undefined
        ? await prisma.$queryRaw<{ pid: number }[]>`
            SELECT pid FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'
            ORDER BY pid`
        : await prisma.$queryRaw<{ pid: number }[]>`
            SELECT pid FROM pg_locks WHERE NOT granted AND relation = to_regclass(${on})
            ORDER BY pid`;
    if (rows.length >= count) return rows.map(({ pid }) => pid);
    if (Date.now() > deadline) {
      throw new Error(`${String(count)} request(s) never waited on a lock`);
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
 * Starts `call` once `hold` has taken its locks, waits until the request waits on them, runs
 * `meanwhile` in the same transaction, commits, then returns the request's answer.
 */
export async function whileHeld(
  hold: (tx: Tx) => Promise<unknown>,
  call: () => PromiseLike<request.Response>,
  meanwhile: (tx: Tx) => Promise<unknown>,
): Promise<request.Response> {
  let answer: Promise<request.Response> | undefined;
  await prisma.$transaction(
    async (tx) => {
      await hold(tx);
      answer = Promise.resolve(call());
      await waitingOnLock();
      await meanwhile(tx);
    },
    { timeout: 10_000 },
  );
  if (!answer) throw new Error('The request never started');
  return answer;
}
