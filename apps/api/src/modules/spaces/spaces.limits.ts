import { FIFTEEN_MINUTES, type RateLimitPolicy } from '../../shared/rate-limit/index.ts';

// The spaces' limits (docs/backend/security.md › Rate limits).

/**
 * Photo uploads by one user, counted on every upload before the file is read: each costs a decode
 * and the store's free allowance. Ten photos with their retries fit easily.
 */
export const PHOTO_UPLOAD: RateLimitPolicy = {
  name: 'photo-upload',
  limit: 30,
  windowMs: FIFTEEN_MINUTES,
};
