import type { Request } from 'express';

import { AppError } from '../errors/index.ts';
import type { AccessClaims } from './accessToken.ts';

/** The signed-in user's claims, which requireAuth put on the request; 401 when it did not run. */
export function signedIn(req: Request): AccessClaims {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}
