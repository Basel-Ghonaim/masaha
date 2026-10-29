import { paginationQuerySchema } from '@masaha/shared/core';
import { priceVisitSchema, visitsQuerySchema } from '@masaha/shared/visits';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';

import type { VisitsController } from './visits.controller.ts';

/**
 * The visits' routes, mounted below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization): the reads are the staff's, so the boundary is their
 * check; the list's range is the owner's, decided in the service; the pricing asks `can()` first,
 * before its body is read.
 */
export function createVisitsManageRouter(controller: VisitsController): Router {
  const router = Router();
  router.get('/visits', validate(visitsQuerySchema, 'query'), controller.list);
  router.get('/visits/:visitId', controller.quote);
  router.get('/visit-terms', controller.terms);
  router.get('/unpriced-visits', validate(paginationQuerySchema, 'query'), controller.unpriced);
  router.put(
    '/visits/:visitId/charge',
    requireCan('attendance.record'),
    validate(priceVisitSchema),
    controller.price,
  );
  return router;
}
