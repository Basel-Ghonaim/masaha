import type request from 'supertest';

import { prisma, type Tx } from '../src/db/index.ts';

// The races of conventions §13, as the API tests run them: a test transaction takes the rows
// another change would hold, a request starts and waits on them, the transaction writes what that
// change would, and commits. The request must then decide on what was committed.

/** Long enough for a request to reach the lock it waits on, bcrypt included. */
const WAIT_MS = 2_000;

/** Locks these users' rows, by id, as a transaction holding their session locks does. */
export async function lockUsers(tx: Tx, ...ids: number[]): Promise<void> {
  const sorted = [...ids].sort((a, b) => a - b);
  for (const id of sorted) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  }
}

/**
 * Starts `call` once `hold` has taken its locks, runs `meanwhile` in the same transaction while the
 * request waits, commits, then returns the request's answer.
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
      await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
      await meanwhile(tx);
    },
    { timeout: 10_000 },
  );
  if (!answer) throw new Error('The request never started');
  return answer;
}
