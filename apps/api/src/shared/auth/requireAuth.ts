import type { Request, RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import type { AccessClaims, AccessTokens } from './accessToken.ts';

declare module 'express-serve-static-core' {
  interface Request {
    /** The signed-in user, set by requireAuth from the access token. */
    auth?: AccessClaims;
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
 * The guard of every signed-in route: 401 without a valid access token, and 403
 * PASSWORD_CHANGE_REQUIRED while the token says a temporary password must be changed.
 */
export function createRequireAuth(tokens: AccessTokens): RequireAuth {
  return ({ allowPendingPasswordChange = false } = {}) =>
    async (req, _res, next) => {
      const claims = await readAccessToken(req, tokens);
      if (!claims) throw AppError.unauthorized();
      if (claims.mustChangePassword && !allowPendingPasswordChange) {
        throw AppError.forbidden('PASSWORD_CHANGE_REQUIRED');
      }
      req.auth = claims;
      next();
    };
}
