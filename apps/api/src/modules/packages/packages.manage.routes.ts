import { createPackageSchema } from '@masaha/shared/packages';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { PackagesController } from './packages.controller.ts';

/**
 * The managed packages router, mounted below `/manage/spaces/:spaceId`, behind that boundary:
 * without an active `OWNER` or `RECEPTION` link at the live space, the caller never reaches it
 * (docs/backend/security.md › Authorization). The writes ask `can()` here first, before their body
 * is read, then the service asks it again under the space's lock.
 */
export function createPackagesManageRouter(controller: PackagesController): Router {
  const router = Router();
  const mayManage = requireCan('packages.manage');
  router.get('/', controller.list);
  router.post('/', mayManage, validate(createPackageSchema), controller.create);
  return router;
}
