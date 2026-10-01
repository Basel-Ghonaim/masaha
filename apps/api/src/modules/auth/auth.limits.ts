import type { RateLimitPolicy } from '../../shared/rate-limit/index.ts';

// The sign-in flows' limits (docs/backend/security.md › Rate limits).
const FIFTEEN_MINUTES = 15 * 60_000;

/** Failed sign-ins and registrations against one account, from one address. */
export const SIGN_IN_ACCOUNT: RateLimitPolicy = {
  name: 'sign-in-account',
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
};

/** Failed sign-ins and registrations from one address, whatever the account. */
export const SIGN_IN_ADDRESS: RateLimitPolicy = {
  name: 'sign-in-address',
  limit: 50,
  windowMs: FIFTEEN_MINUTES,
};

/** Refreshes by one user. */
export const REFRESH: RateLimitPolicy = { name: 'refresh', limit: 30, windowMs: FIFTEEN_MINUTES };
