import { describe, expect, it } from 'vitest';

import type { AppError } from '../errors/index.ts';
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
    peek: (key) => Promise.resolve(counts.get(key)),
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

  it('checks failures without counting, and refuses once they reached the limit', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    await limiter.check(policy, 'a');
    expect(counts.size).toBe(0);

    for (let failure = 0; failure < 2; failure++) await limiter.recordFailure(policy, 'a');
    await expect(limiter.check(policy, 'a')).resolves.toBeUndefined();

    await limiter.recordFailure(policy, 'a');
    expect((await rejection(limiter.check(policy, 'a'))).type).toBe('rate_limit');
  });

  it('keys by the policy and a digest, never the raw values', async () => {
    const { counts, counter } = fakeCounter();
    const limiter = createLimiter(counter, () => NOW);

    await limiter.count(policy, '203.0.113.7', 'sara@example.com');

    expect([...counts.keys()]).toEqual([expect.stringMatching(/^sign-in:[0-9a-f]{64}$/)]);
  });
});
