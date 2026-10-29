import { paginationQuerySchema } from '@masaha/shared/core';
import { paymentsQuerySchema } from '@masaha/shared/payments';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { PaymentsController } from './payments.controller.ts';

/**
 * The ledger's reads, mounted below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization): the staff's, so the boundary is their check; the
 * payments list is narrowed to reception's own by `can()` in the service. The written-off visits
 * are the owner's, who writes them off: `can()` refuses reception before the query is read.
 */
export function createPaymentsManageRouter(controller: PaymentsController): Router {
  const router = Router();
  router.get('/payments', validate(paymentsQuerySchema, 'query'), controller.list);
  router.get(
    '/uncollected-visits',
    validate(paginationQuerySchema, 'query'),
    controller.uncollected,
  );
  router.get(
    '/written-off-visits',
    requireCan('visits.writeOff'),
    validate(paginationQuerySchema, 'query'),
    controller.writtenOff,
  );
  return router;
}
