import { z } from 'zod';

// The password policy (docs/backend/security.md › Passwords). The upper bound is bcrypt's: it
// ignores every byte after the 72nd, so it is counted in UTF-8 bytes, not characters: an Arabic
// letter takes two.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** 8 characters to 72 bytes, with at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine((password) => new TextEncoder().encode(password).length <= PASSWORD_MAX_LENGTH, {
    params: { code: 'too_long' },
  })
  .regex(/\p{L}/u)
  .regex(/\p{N}/u);
