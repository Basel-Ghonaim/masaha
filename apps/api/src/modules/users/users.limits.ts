import { FIFTEEN_MINUTES, type RateLimitPolicy } from '../../shared/rate-limit/index.ts';

/**
 * Wrong current passwords at /me/password, by the user: a stolen access token must not turn into
 * unlimited guesses (docs/backend/security.md › Rate limits). By user, not address: a thief can
 * change address.
 */
export const PASSWORD_CHANGE: RateLimitPolicy = {
  name: 'password-change',
  limit: 10,
  windowMs: FIFTEEN_MINUTES,
};
