import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, passwordSchema } from './password.ts';
import { textSchema } from './text.ts';

// The requests and the session of the auth endpoints (docs/api/api-contract.md §5).

/** The interface languages (docs/frontend/localisation.md). */
export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Stored lowercased, so one address is one account. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const NAME_MAX_LENGTH = 100;

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

/** The global role (ADR 0002). */
export type Role = 'USER' | 'OWNER' | 'ADMIN';

/** One of the user's active links to a space, and their role there (ADR 0009). */
export interface SessionSpaceLink {
  spaceId: number;
  role: 'OWNER' | 'RECEPTION';
}

/** Who is signed in. */
export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  language: Language;
  /** A temporary password must be changed before anything else (docs/backend/security.md). */
  mustChangePassword: boolean;
  /** False for a Google-only account, which sets its first password without a current one. */
  hasPassword: boolean;
  /** The user's active space links, oldest first. */
  spaces: SessionSpaceLink[];
}

/** What a sign-in, a registration and a refresh answer, beside the refresh cookie. */
export interface Session {
  user: SessionUser;
  /** Kept in memory only (ADR 0003). */
  accessToken: string;
}
