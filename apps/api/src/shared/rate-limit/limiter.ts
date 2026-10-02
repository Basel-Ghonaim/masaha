import { createHash } from 'node:crypto';

import type { Request, RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import type { Counter } from './counter.ts';
import { isOverLimit, tooManyRequests, type RateLimitPolicy } from './policy.ts';

/** A counted attempt that can still be given back. */
export interface Reservation {
  refund(): Promise<void>;
}

/** A policy, and what it counts by. */
export interface LimitBy {
  policy: RateLimitPolicy;
  by: string[];
}

/**
 * Applies the rate-limit policies over the shared counter. Every count is one atomic statement,
 * written before the response is sent: a function may be frozen as soon as it answers (ADR 0014).
 * A key is the policy's name and a digest of what it counts by, so the table holds no address, IP
 * or token in clear.
 */
export interface Limiter {
  /** Counts this attempt, and refuses it with a 429 once it is over the limit. */
  count(policy: RateLimitPolicy, ...by: string[]): Promise<void>;
  /** Counts this attempt like `count`, and returns a way to give it back. */
  reserve(policy: RateLimitPolicy, ...by: string[]): Promise<Reservation>;
  /**
   * Runs an attempt under limits that count only failures (docs/backend/security.md › Rate
   * limits). Each attempt reserves its slot first, so a concurrent burst cannot pass a check
   * before its failures are written. A success, or a failure of the server (a 5xx), gives the
   * slots back before the answer; a refused attempt (a 4xx) keeps them as its failure.
   */
  limitFailures<T>(limits: LimitBy[], attempt: () => Promise<T>): Promise<T>;
}

export function createLimiter(counter: Counter, now: () => Date = () => new Date()): Limiter {
  const keyOf = (policy: RateLimitPolicy, by: string[]) =>
    `${policy.name}:${createHash('sha256').update(by.join('\n')).digest('hex')}`;

  async function reserve(policy: RateLimitPolicy, ...by: string[]): Promise<Reservation> {
    const key = keyOf(policy, by);
    const count = await counter.hit(key, policy.windowMs);
    if (isOverLimit(policy, count)) throw tooManyRequests(policy, count, now());
    return { refund: () => counter.refund(key, count) };
  }

  const refundAll = async (reservations: Reservation[]) => {
    for (const reservation of reservations) await reservation.refund();
  };

  return {
    async count(policy, ...by) {
      await reserve(policy, ...by);
    },

    reserve,

    async limitFailures(limits, attempt) {
      const reserved: Reservation[] = [];
      try {
        for (const { policy, by } of limits) reserved.push(await reserve(policy, ...by));
      } catch (error) {
        // A later limit refused: the slots already taken are given back.
        await refundAll(reserved);
        throw error;
      }

      let result;
      try {
        result = await attempt();
      } catch (error) {
        if (!(error instanceof AppError) || error.status >= 500) await refundAll(reserved);
        throw error;
      }
      await refundAll(reserved);
      return result;
    },
  };
}

/** A limit counted on every request a route receives: which policy applies, and what it counts by. */
export type RequestLimit = (req: Request) => Promise<LimitBy>;

/** A route middleware that counts each request under the limit `limitOf` picks for it. */
export function limitRequests(limiter: Limiter, limitOf: RequestLimit): RequestHandler {
  return async (req, _res, next) => {
    const { policy, by } = await limitOf(req);
    await limiter.count(policy, ...by);
    next();
  };
}
