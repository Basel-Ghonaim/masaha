import { AppError } from '../errors/index.ts';
import type { Count } from './counter.ts';

/** A limit and its fixed window. The numbers are owned by docs/backend/security.md › Rate limits. */
export interface RateLimitPolicy {
  /** Names the policy in its keys and in the RateLimit headers. */
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
}

/** After a hit: whether that hit went over the limit. */
export function isOverLimit(policy: RateLimitPolicy, count: Count): boolean {
  return count.hits > policy.limit;
}

/** The 429 for a policy whose window ends at `count.resetAt`. */
export function tooManyRequests(policy: RateLimitPolicy, count: Count, now: Date): AppError {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((count.resetAt.getTime() - now.getTime()) / 1000),
  );
  return AppError.rateLimit(undefined, `Rate limit ${policy.name} reached`, {
    policy: policy.name,
    limit: policy.limit,
    windowSeconds: Math.round(policy.windowMs / 1000),
    retryAfterSeconds,
  });
}
