import type { RateLimitPolicy } from '../../shared/rate-limit/index.ts';

// The space links' limits (docs/backend/security.md › Rate limits).

/**
 * Staff accounts an owner creates or re-issues, counted before the body is read: each costs a
 * bcrypt hash, and a creation an account row.
 */
export const STAFF_ACCOUNT: RateLimitPolicy = {
  name: 'staff-account',
  limit: 10,
  windowMs: 60 * 60_000,
};
