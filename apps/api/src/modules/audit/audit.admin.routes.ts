import { platformAuditQuerySchema } from '@masaha/shared/audit';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AuditController } from './audit.controller.ts';

/**
 * The platform's audit log, mounted at `/audit-log` inside `/admin`, behind `requireRole('ADMIN')`
 * (docs/backend/security.md › Authorization): the platform's events only, by the default-deny list.
 */
export function createAuditAdminRouter(controller: AuditController): Router {
  const router = Router();
  router.get('/', validate(platformAuditQuerySchema, 'query'), controller.platformLog);
  return router;
}
