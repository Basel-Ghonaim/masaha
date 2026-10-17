import type { RequestHandler } from 'express';

import { AppError } from '../errors/index.ts';
import { can, type SpaceAction } from './can.ts';
import { signedIn } from './signedIn.ts';
import { spaceOf } from './spaceLinks.ts';

/**
 * The guard of one action on the route's space, mounted after the space's links are loaded: 403
 * when can() refuses it (docs/backend/security.md › Authorization). It refuses before the request's
 * body is read or counted; the service's own can(), under the space's lock, still decides.
 */
export function requireCan(action: SpaceAction): RequestHandler {
  return (req, _res, next) => {
    const { userId, role } = signedIn(req);
    if (!can({ id: userId, role }, action, spaceOf(req))) throw AppError.forbidden();
    next();
  };
}
