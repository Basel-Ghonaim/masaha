import type { SessionSpaceLink } from '../space-links/index.ts';
import type { User } from '../users/index.ts';

// The answers of the auth endpoints (docs/api/api-contract.md §5).

/** Who is signed in: the account and its space links. */
export interface SessionUser extends User {
  /** The user's active space links, oldest first. */
  spaces: SessionSpaceLink[];
}

/** What a sign-in, a registration and a refresh answer, beside the refresh cookie. */
export interface Session {
  user: SessionUser;
  /** Kept in memory only (ADR 0003). */
  accessToken: string;
}

/** A Google sign-in's answer: `linked` when it has just joined Google to an existing account. */
export interface GoogleSession extends Session {
  linked: boolean;
}

/**
 * Where the caller stands in recovering a password, as the server holds it
 * (docs/api/api-contract.md › The forgotten password). The email is always masked.
 * - `request`: no recovery in this browser;
 * - `sent`: a link was asked for; another may be asked for while `canResend`, once
 *   `resendInSeconds` reaches 0;
 * - `password`: a link was checked in this browser, and the new password is next.
 */
export type RecoveryPosition =
  | { step: 'request' }
  | { step: 'sent'; email: string; resendInSeconds: number; canResend: boolean }
  | { step: 'password'; email: string };
