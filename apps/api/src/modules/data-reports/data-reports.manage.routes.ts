import { decideReportSchema, spaceReportsQuerySchema } from '@masaha/shared/data-reports';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { DataReportsController } from './data-reports.controller.ts';

/**
 * The space's reports, mounted at `/data-reports` below `/manage/spaces/:spaceId`, behind that
 * boundary (docs/backend/security.md › Authorization): the owner's, so each route asks `can()` first,
 * refusing reception before the query or the body is read; the decision asks it again under the
 * space's lock.
 */
export function createDataReportsManageRouter(controller: DataReportsController): Router {
  const router = Router();
  router.get(
    '/',
    requireCan('space.dataReports.read'),
    validate(spaceReportsQuerySchema, 'query'),
    controller.ofSpace,
  );
  router.patch(
    '/:reportId',
    requireCan('dataReports.resolve'),
    validate(decideReportSchema),
    controller.decideAtSpace,
  );
  return router;
}
