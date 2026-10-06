import type { RequestHandler } from 'express';

import type { Role } from '../../generated/prisma/enums.ts';
import { AppError } from '../errors/index.ts';

/**
 * The guard of a prefix kept for some global roles, mounted after requireAuth: 403 for any other
 * role (docs/backend/security.md › Authorization). The composition root mounts it once on /admin.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!roles.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}
