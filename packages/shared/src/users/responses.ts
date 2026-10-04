import type { Language } from '../core/index.ts';

/** The global role (ADR 0002). */
export type Role = 'USER' | 'OWNER' | 'ADMIN';

/** The account as the session shows it; the session adds the user's space links. */
export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  language: Language;
  /** A temporary password must be changed before anything else (docs/backend/security.md). */
  mustChangePassword: boolean;
  /** False for a Google-only account, which sets its first password without a current one. */
  hasPassword: boolean;
}

/** What a password change answers, beside a new refresh cookie: the session goes on, renewed. */
export interface PasswordChanged {
  accessToken: string;
}
