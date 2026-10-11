import type { Request } from 'express';

import { AppError } from '../errors/index.ts';
import type { SignedIn } from './requireAuth.ts';

/** The signed-in user, whom requireAuth put on the request; 401 when it did not run. */
export function signedIn(req: Request): SignedIn {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}
