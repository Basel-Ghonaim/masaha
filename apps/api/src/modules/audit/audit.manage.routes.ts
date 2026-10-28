import { spaceAuditQuerySchema } from '@masaha/shared/audit';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { AuditController } from './audit.controller.ts';

/**
 * The space's audit log, mounted at `/audit-log` below `/manage/spaces/:spaceId`, behind that
 * boundary (docs/backend/security.md › Authorization): the owner's, so `can()` refuses reception
 * before the query is read.
 */
export function createAuditManageRouter(controller: AuditController): Router {
  const router = Router();
  router.get(
    '/',
    requireCan('space.auditLog.read'),
    validate(spaceAuditQuerySchema, 'query'),
    controller.spaceLog,
  );
  return router;
}
