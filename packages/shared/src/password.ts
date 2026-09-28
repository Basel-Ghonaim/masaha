import { z } from 'zod';

// The password policy (docs/backend/security.md › Passwords). The upper bound is bcrypt's: it
// ignores every byte after the 72nd.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** 8–72 characters, with at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .regex(/\p{L}/u)
  .regex(/\p{N}/u);
