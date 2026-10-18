import { Router } from 'express';

import type { PackagesController } from './packages.controller.ts';

/**
 * The managed packages router, mounted below `/manage/spaces/:spaceId`, behind that boundary:
 * without an active `OWNER` or `RECEPTION` link at the live space, the caller never reaches it
 * (docs/backend/security.md â€º Authorization).
 */
export function createPackagesManageRouter(controller: PackagesController): Router {
  const router = Router();
  router.get('/', controller.list);
  return router;
}
