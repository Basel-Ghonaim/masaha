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

/** Which account a valid reset link is for, so the page can name it before the form is sent. */
export interface ResetCheck {
  email: string;
}
