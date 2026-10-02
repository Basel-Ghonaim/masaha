import { FIFTEEN_MINUTES, type RateLimitPolicy } from '../../shared/rate-limit/index.ts';

// The sign-in flows' limits (docs/backend/security.md › Rate limits).

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

/**
 * Registrations from one address, successful or not, counted before the password is hashed: each
 * costs a bcrypt hash and an account row. Enough for a space's newcomers.
 */
export const REGISTER_ADDRESS: RateLimitPolicy = {
  name: 'register-address',
  limit: 20,
  windowMs: 60 * 60_000,
};

/**
 * Failed Google sign-ins from one address. Its own policy, so junk tokens, which fail in
 * microseconds, lock only Google sign-in out, never the password sign-ins of a shared address.
 */
export const GOOGLE_ADDRESS: RateLimitPolicy = {
  name: 'google-address',
  limit: 50,
  windowMs: FIFTEEN_MINUTES,
};

/** Refreshes by one user. */
export const REFRESH: RateLimitPolicy = { name: 'refresh', limit: 30, windowMs: FIFTEEN_MINUTES };

/** Reset links asked for one email, from one address. */
export const PASSWORD_EMAIL: RateLimitPolicy = {
  name: 'password-email',
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
};

/** Checks and uses of one reset link, from one address. */
export const PASSWORD_TOKEN: RateLimitPolicy = {
  name: 'password-token',
  limit: 5,
  windowMs: FIFTEEN_MINUTES,
};

/** The forgotten-password requests of one address together. */
export const PASSWORD_ADDRESS: RateLimitPolicy = {
  name: 'password-address',
  limit: 50,
  windowMs: FIFTEEN_MINUTES,
};
