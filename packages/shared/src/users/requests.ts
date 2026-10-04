import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, passwordSchema } from './passwordPolicy.ts';

// The requests of the account's own endpoints (docs/api/api-contract.md §5).

/** The account's name, at most this many characters. */
export const NAME_MAX_LENGTH = 100;

/**
 * A new password for the signed-in user. The current one is required, except while a temporary
 * password is pending and for a Google-only account's first password.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH).optional(),
  password: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
