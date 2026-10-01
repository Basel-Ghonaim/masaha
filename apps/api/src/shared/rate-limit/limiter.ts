import { createHash } from 'node:crypto';

import type { Request, RequestHandler } from 'express';

import type { Counter } from './counter.ts';
import { isAtLimit, isOverLimit, tooManyRequests, type RateLimitPolicy } from './policy.ts';

/**
 * Applies the rate-limit policies over the shared counter. Every count is written before the
 * response is sent: a function may be frozen as soon as it answers (ADR 0014). A key is the
 * policy's name and a digest of what it counts by, so the table never holds an address, an IP or
 * a token.
 */
export interface Limiter {
  /** Counts this attempt, and refuses it with a 429 once it is over the limit. */
  count(policy: RateLimitPolicy, ...by: string[]): Promise<void>;
  /** For limits that count only failures: refuses once they reached the limit. Counts nothing. */
  check(policy: RateLimitPolicy, ...by: string[]): Promise<void>;
  /** Counts one failure, where the failure is decided and before it is answered. */
  recordFailure(policy: RateLimitPolicy, ...by: string[]): Promise<void>;
}

export function createLimiter(counter: Counter, now: () => Date = () => new Date()): Limiter {
  const keyOf = (policy: RateLimitPolicy, by: string[]) =>
    `${policy.name}:${createHash('sha256').update(by.join('\n')).digest('hex')}`;

  return {
    async count(policy, ...by) {
      const count = await counter.hit(keyOf(policy, by), policy.windowMs);
      if (isOverLimit(policy, count)) throw tooManyRequests(policy, count, now());
    },

    async check(policy, ...by) {
      const count = await counter.peek(keyOf(policy, by));
      if (count && isAtLimit(policy, count)) throw tooManyRequests(policy, count, now());
    },

    async recordFailure(policy, ...by) {
      await counter.hit(keyOf(policy, by), policy.windowMs);
    },
  };
}

/** A limit counted on every request a route receives: which policy applies, and what it counts by. */
export type RequestLimit = (
  req: Request,
) => { policy: RateLimitPolicy; by: string[] } | Promise<{ policy: RateLimitPolicy; by: string[] }>;

/** A route middleware that counts each request under the limit `limitOf` picks for it. */
export function limitRequests(limiter: Limiter, limitOf: RequestLimit): RequestHandler {
  return async (req, _res, next) => {
    const { policy, by } = await limitOf(req);
    await limiter.count(policy, ...by);
    next();
  };
}
