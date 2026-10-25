import { createReportSchema, myReportsQuerySchema } from '@masaha/shared/data-reports';
import { Router } from 'express';

import { signedIn, type RequireAuth } from '../../shared/auth/index.ts';
import { limitRequests, type Limiter } from '../../shared/rate-limit/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { DataReportsController } from './data-reports.controller.ts';
import { DATA_REPORT } from './data-reports.limits.ts';

/**
 * The signed-in user's reports, mounted at the API's root: a report of a listed space
 * (`POST /spaces/:slug/reports`), counted by the user before its body is read
 * (docs/backend/security.md › Rate limits), and the user's own (`GET /me/reports`).
 */
export function createDataReportsSiteRouter({
  controller,
  requireAuth,
  limiter,
}: {
  controller: DataReportsController;
  requireAuth: RequireAuth;
  limiter: Limiter;
}): Router {
  const router = Router();
  const counted = limitRequests(limiter, (req) =>
    Promise.resolve({ policy: DATA_REPORT, by: [String(signedIn(req).userId)] }),
  );
  router.post(
    '/spaces/:slug/reports',
    requireAuth(),
    counted,
    validate(createReportSchema),
    controller.create,
  );
  router.get(
    '/me/reports',
    requireAuth(),
    validate(myReportsQuerySchema, 'query'),
    controller.mine,
  );
  return router;
}
