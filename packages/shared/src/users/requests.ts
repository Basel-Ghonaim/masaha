import { z } from 'zod';

import { emailSchema, LANGUAGES, textSchema } from '../core/index.ts';
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
  /** Only in the forced change: the address confirmed, or corrected (A2). */
  email: emailSchema.optional(),
});
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

/** How a temporary password reached its person: on WhatsApp, in person, or another way. */
export const HANDOVER_CHANNELS = ['WHATSAPP', 'IN_PERSON', 'OTHER'] as const;

export type HandoverChannel = (typeof HANDOVER_CHANNELS)[number];

/** How the temporary password just shown was handed over, for the audit (the owner's A5). */
export const handoverSchema = z.object({ channel: z.enum(HANDOVER_CHANNELS) });

export type HandoverRequest = z.infer<typeof handoverSchema>;

/** The admin suspends an account, or restores it. */
export const setSuspendedSchema = z.object({ isSuspended: z.boolean() });

export type SetSuspendedRequest = z.infer<typeof setSuspendedSchema>;

/**
 * The signed-in user's edit of their own account: the name, the interface language, or both; what
 * is absent is kept.
 */
export const updateMeSchema = z
  .object({ name: textSchema(1, NAME_MAX_LENGTH), language: z.enum(LANGUAGES) })
  .partial();

export type UpdateMeRequest = z.infer<typeof updateMeSchema>;
