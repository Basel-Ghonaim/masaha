import { adminReportsQuerySchema, decideReportSchema } from '@masaha/shared/data-reports';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { DataReportsController } from './data-reports.controller.ts';

/**
 * Every space's reports, mounted at `/data-reports` inside `/admin`, behind `requireRole('ADMIN')`
 * (docs/backend/security.md › Authorization). The decision asks `can()` under the space's lock:
 * the admin decides an unverified space's report only.
 */
export function createDataReportsAdminRouter(controller: DataReportsController): Router {
  const router = Router();
  router.get('/', validate(adminReportsQuerySchema, 'query'), controller.all);
  router.patch('/:reportId', validate(decideReportSchema), controller.decideAsAdmin);
  return router;
}
