import { Router } from 'express';

import type { OverviewController } from './overview.controller.ts';

/**
 * The admin's overview, mounted at `/overview` inside `/admin`, behind `requireRole('ADMIN')`
 * (docs/backend/security.md › Authorization). It writes nothing and takes no query.
 */
export function createOverviewAdminRouter(controller: OverviewController): Router {
  const router = Router();
  router.get('/', controller.admin);
  return router;
}
