import type { Request, RequestHandler } from 'express';

import type { Role } from '../../generated/prisma/enums.ts';
import { AppError } from '../errors/index.ts';
import type { AccessClaims, AccessTokens } from './accessToken.ts';
import { isIdleBound, type IdleSessions } from './idle.ts';

/** The account as the guard reads it on every signed-in request. */
export interface SignedInAccount {
  role: Role;
  mustChangePassword: boolean;
  suspended: boolean;
  /** One more each time every session of the account ended. */
  sessionVersion: number;
}

/** The account with this id as it is now, or nothing when there is none. */
export type AccountReader = (userId: number) => Promise<SignedInAccount | null>;

/** Who is signed in, as requireAuth read them: the account's role now, and the token's claim. */
export interface SignedIn {
  userId: number;
  /** The account's global role now, never the token's (ADR 0003, revised). */
  role: Role;
  /**
   * Whether the token was signed while a temporary password was pending: the token's half of the
   * forced change's double check (docs/backend/security.md › Passwords).
   */
  tokenPendingChange: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** The signed-in user, set by requireAuth from the access token and the account. */
    auth?: SignedIn;
  }
}

/** The claims of the request's bearer token, if it carries a valid one. */
export async function readAccessToken(
  req: Request,
  tokens: AccessTokens,
): Promise<AccessClaims | undefined> {
  const header = req.get('authorization');
  const match = header && /^Bearer (\S+)$/i.exec(header);
  return match?.[1] ? tokens.verify(match[1]) : undefined;
}

export interface RequireAuthOptions {
  /**
   * Lets a user whose temporary password is pending through. Only the routes that change it, sign
   * out or read the account itself allow this (docs/backend/security.md › Passwords).
   */
  allowPendingPasswordChange?: boolean;
}

export type RequireAuth = (options?: RequireAuthOptions) => RequestHandler;

/**
 * The guard of every signed-in route (docs/backend/security.md › Authorization). It reads the
 * account by the token's id on every request, so a suspension, a role change or a temporary password
 * takes effect at once (ADR 0003, revised): 401 without a valid access token, for an account that
 * does not exist, for a suspended one, for a token signed before every session of the account last
 * ended, and for one signed before a temporary password; then 403
 * PASSWORD_CHANGE_REQUIRED while the token says a temporary password must be changed. The composition root wires the reader, as it
 * wires the links loader: `shared/` imports no module. Last, for an idle-bound account (reception
 * only), its session: 401 once signed out, 401 `SESSION_IDLE` once idle past its minutes, else
 * renewed unless the request is passive (docs/backend/security.md › Tokens and cookies).
 */
export function createRequireAuth(
  tokens: AccessTokens,
  readAccount: AccountReader,
  idle: IdleSessions,
): RequireAuth {
  return ({ allowPendingPasswordChange = false } = {}) =>
    async (req, _res, next) => {
      const claims = await readAccessToken(req, tokens);
      if (!claims) throw AppError.unauthorized();
      const account = await readAccount(claims.userId);
      if (!account) throw AppError.unauthorized(undefined, 'Account not found');
      // The suspension ended every session; a 401 makes the web's refresh find that out.
      if (account.suspended) throw AppError.unauthorized(undefined, 'Account suspended');
      // Every session of the account ended after this token was signed: a password change, a reset,
      // a suspension, a role change, a temporary password or a Google link. The 401 ends this one.
      if (account.sessionVersion !== claims.sessionVersion) {
        throw AppError.unauthorized(undefined, 'Session ended');
      }
      // A change pending in the account but not in the token: the token was signed before a
      // temporary password, whose issue ended every session. The same 401 ends this one.
      if (account.mustChangePassword && !claims.mustChangePassword) {
        throw AppError.unauthorized(undefined, 'Session ended by a temporary password');
      }
      if (claims.mustChangePassword && !allowPendingPasswordChange) {
        throw AppError.forbidden('PASSWORD_CHANGE_REQUIRED');
      }
      if (await isIdleBound(account.role, () => idle.linkRolesOf(claims.userId))) {
        // The idle session is refused, not ended: the web's refresh ends it, and says why.
        const state = await idle.stateOf(claims.sessionId, !req.passive);
        if (state === 'ended') throw AppError.unauthorized(undefined, 'Session ended');
        if (state === 'idle') throw AppError.unauthorized('SESSION_IDLE', 'Session idle');
      }
      req.auth = {
        userId: claims.userId,
        role: account.role,
        tokenPendingChange: claims.mustChangePassword,
      };
      next();
    };
}
