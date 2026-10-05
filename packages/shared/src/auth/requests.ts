import { z } from 'zod';

import { emailSchema, LANGUAGES, textSchema } from '../core/index.ts';
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, passwordSchema } from '../users/index.ts';

// The requests of the auth endpoints (docs/api/api-contract.md §5).

export const registerSchema = z.object({
  name: textSchema(1, NAME_MAX_LENGTH),
  email: emailSchema,
  password: passwordSchema,
  /** The interface language at registration, so the account starts in it. */
  language: z.enum(LANGUAGES).optional(),
});
export type RegisterRequest = z.infer<typeof registerSchema>;

/** The password policy is not checked at sign-in: a password set before a policy change still works. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof loginSchema>;

/** A Google OpenID Connect ID token, from Google's sign-in on the web (docs/backend/security.md). */
export const googleSignInSchema = z.object({
  idToken: z.string().min(1).max(4096),
  /** The interface language, for an account this sign-in creates. */
  language: z.enum(LANGUAGES).optional(),
});
export type GoogleSignInRequest = z.infer<typeof googleSignInSchema>;

/** Asks for a reset link. The answer is the same whether or not the email has an account. */
export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

/** A reset link's token, as the web reads it from the link's fragment. */
const resetTokenSchema = z.string().min(1).max(256);

export const resetCheckSchema = z.object({ token: resetTokenSchema });
export type ResetCheckRequest = z.infer<typeof resetCheckSchema>;

/**
 * Asks the browser's recovery for another link. The address is the recovery's, never the caller's
 * to give, so the body is empty: any field is refused.
 */
export const resendLinkSchema = z.strictObject({}).optional();

export const resetPasswordSchema = z.object({ token: resetTokenSchema, password: passwordSchema });
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
