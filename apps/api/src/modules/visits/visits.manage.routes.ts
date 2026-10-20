import { Router } from 'express';

import type { VisitsController } from './visits.controller.ts';

/**
 * The visits' reads, mounted below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization): the staff's, so the boundary is their check.
 */
export function createVisitsManageRouter(controller: VisitsController): Router {
  const router = Router();
  router.get('/visits/:visitId', controller.quote);
  router.get('/visit-terms', controller.terms);
  return router;
}
