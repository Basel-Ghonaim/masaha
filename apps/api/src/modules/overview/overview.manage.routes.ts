import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import type { OverviewController } from './overview.controller.ts';

/**
 * The owner's overview, mounted at `/overview` below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization): the owner's only, so `can()` refuses reception (OV3).
 * It writes nothing and takes no query; nothing polls it, so it is not passive (`markPassive`).
 */
export function createOverviewManageRouter(controller: OverviewController): Router {
  const router = Router();
  router.get('/', requireCan('space.overview.read'), controller.owner);
  return router;
}
