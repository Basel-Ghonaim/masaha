import type { RateLimitPolicy } from '../../shared/rate-limit/index.ts';

// The data reports' limits (docs/backend/security.md › Rate limits).

/**
 * Reports a user sends, counted at the route before the body is read, a repeat of an open one and
 * an invalid body included: each may write a row the owner and the admin read.
 */
export const DATA_REPORT: RateLimitPolicy = {
  name: 'data-report',
  limit: 10,
  windowMs: 60 * 60_000,
};
