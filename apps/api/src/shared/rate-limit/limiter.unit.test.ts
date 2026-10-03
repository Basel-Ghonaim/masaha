import { describe, expect, it } from 'vitest';

import { AppError } from '../errors/index.ts';
import type { Count, Counter } from './counter.ts';
import { createLimiter } from './limiter.ts';
import type { RateLimitPolicy } from './policy.ts';

const NOW = new Date('2026-10-01T10:00:00Z');
const policy: RateLimitPolicy = { name: 'sign-in', limit: 3, windowMs: 15 * 60_000 };

/** An in-memory counter whose window ends 90 s after NOW. */
function fakeCounter() {
  const counts = new Map<string, Count>();
  const counter: Counter = {
    hit(key) {
      const count = {
        hits: (counts.get(key)?.hits ?? 0) + 1,
        resetAt: new Date(NOW.getTime() + 90_000),
      };
      counts.set(key, count);
      return Promise.resolve(count);
    },
    refund(key, { resetAt }) {
      const count = counts.get(key);
      if (count && count.resetAt === resetAt && count.hits > 0) count.hits -= 1;
      return Promise.resolve();
    },
  };
  return { counts, counter };
}

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error('Expected a rejection');
}

describe('createLimiter', () => {
  it('lets a count through up to the limit, and refuses the one after it', async () => {
    const limiter = createLimiter(fakeCounter().counter, () => NOW);

    for (let attempt = 0; attempt < 3; attempt++) await limiter.count(policy, 'a');

    const error = await rejection(limiter.count(policy, 'a'));
    expect(error.type).toBe('rate_limit');
    expect(error.rateLimitState).toEqual({
      policy: 'sign-in',
      limit: 3,
      windowSeconds: 900,
      retryAfterSeconds: 90,
    });
  });

  it('counts each value it counts by apart', async () => {
    const limiter = createLimiter(fakeCounter().counter, () => NOW);

    for (let attempt = 0; attempt < 3; attempt++) await limiter.count(policy, 'a');

    await expect(limiter.count(policy, 'b')).resolves.toBeUndefined();
  });

  it('gives a reserved slot back', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    const reservation = await limiter.reserve(policy, 'a');
    await reservation.refund();

    expect([...counts.values()].map(({ hits }) => hits)).toEqual([0]);
  });

  it('keys by the policy and a digest, never the raw values', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    await limiter.count(policy, '203.0.113.7', 'sara@example.com');

    expect([...counts.keys()]).toEqual([expect.stringMatching(/^sign-in:[0-9a-f]{64}$/)]);
  });
});

describe('limitFailures', () => {
  const account: RateLimitPolicy = { name: 'account', limit: 2, windowMs: 60_000 };
  const address: RateLimitPolicy = { name: 'address', limit: 5, windowMs: 60_000 };
  const limits = [
    { policy: address, by: ['ip'] },
    { policy: account, by: ['ip', 'sara'] },
  ];
  const hits = (counts: Map<string, Count>) =>
    [...counts.entries()].map(([key, { hits: n }]) => [key.split(':')[0], n]);

  it('keeps the slots of a refused attempt (a 4xx) as its failure', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    const refused = rejection(
      limiter.limitFailures(limits, () => Promise.reject(AppError.unauthorized())),
    );

    expect((await refused).type).toBe('unauthorized');
    expect(hits(counts)).toEqual([
      ['address', 1],
      ['account', 1],
    ]);
  });

  it('gives the slots back on a success and on a failure of the server', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    await limiter.limitFailures(limits, () => Promise.resolve('ok'));
    await rejection(limiter.limitFailures(limits, () => Promise.reject(new Error('bug'))));
    await rejection(limiter.limitFailures(limits, () => Promise.reject(AppError.server())));

    expect(hits(counts)).toEqual([
      ['address', 0],
      ['account', 0],
    ]);
  });

  it('refuses before the attempt once failures reached a limit, and returns the earlier slot', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);
    const fail = () => Promise.reject(AppError.unauthorized());
    await rejection(limiter.limitFailures(limits, fail));
    await rejection(limiter.limitFailures(limits, fail));

    let tried = false;
    const refused = await rejection(
      limiter.limitFailures(limits, () => {
        tried = true;
        return Promise.resolve();
      }),
    );

    expect(refused.type).toBe('rate_limit');
    expect(tried).toBe(false);
    expect(hits(counts)).toEqual([
      ['address', 2],
      ['account', 3],
    ]);
  });
});
