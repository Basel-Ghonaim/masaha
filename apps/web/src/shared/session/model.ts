import type { Session, SessionUser } from '@masaha/shared';

/** The contract's shapes (docs/api/api-contract.md §5 › Session), held as the server sends them. */
export type { Session, SessionUser };

/** Why a restore could not reach the server: no connection, or an answer that was not a verdict. */
export type UnreachableReason = 'offline' | 'error';

/**
 * Who is signed in on this page (docs/frontend/architecture.md §4):
 * - `restoring`: the startup restore is asking the server;
 * - `authenticated`: the user and the access token, kept in memory only (ADR 0003);
 * - `anonymous`: no session;
 * - `unreachable`: a session may exist, but the restore could not reach the server; it can be retried.
 */
export type SessionState =
  | { status: 'authenticated'; user: SessionUser; accessToken: string }
  | { status: 'restoring' | 'anonymous'; user: null; accessToken: null }
  | { status: 'unreachable'; reason: UnreachableReason; user: null; accessToken: null };

export type SessionStatus = SessionState['status'];

/** How a session arrived: a sign-in by the user, or a restore or refresh of one that existed. */
export type SessionSource = 'signIn' | 'restore';

export type SessionEstablishedListener = (
  session: Session,
  context: { source: SessionSource },
) => void;
