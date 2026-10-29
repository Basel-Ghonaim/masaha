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

/** The signed-in user's own account, as its settings read and edit it. */
export interface MyAccount {
  id: number;
  name: string;
  email: string;
  language: Language;
  role: Role;
}

/** A temporary password the admin issued, answered once and never again (docs/backend/security.md). */
export interface IssuedTemporaryPassword {
  temporaryPassword: string;
}

/** What a password change answers, beside a new refresh cookie: the session goes on, renewed. */
export interface PasswordChanged {
  accessToken: string;
}
