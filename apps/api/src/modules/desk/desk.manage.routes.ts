import {
  checkOutVisitSchema,
  leaveToCustomerSchema,
  receivePaymentSchema,
} from '@masaha/shared/desk';
import { checkInVisitSchema, writeOffVisitSchema } from '@masaha/shared/visits';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { requireIdempotencyKey } from '../../shared/http/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { DeskController } from './desk.controller.ts';

/**
 * The front desk's router, mounted below `/manage/spaces/:spaceId`, behind that boundary
 * (docs/backend/security.md › Authorization). Each write asks `can()` here first, then reads its
 * idempotency key, both before its body is read; the service asks `can()` again under the space's
 * lock.
 */
export function createDeskManageRouter(controller: DeskController): Router {
  const router = Router();
  const mayRecord = requireCan('attendance.record');
  router.post(
    '/visits',
    mayRecord,
    requireIdempotencyKey,
    validate(checkInVisitSchema),
    controller.checkInVisit,
  );
  router.post(
    '/visits/:visitId/check-out',
    mayRecord,
    requireIdempotencyKey,
    validate(checkOutVisitSchema),
    controller.checkOutVisit,
  );
  router.post(
    '/payments',
    requireCan('payments.record'),
    requireIdempotencyKey,
    validate(receivePaymentSchema),
    controller.receivePayment,
  );
  router.put(
    '/visits/:visitId/customer',
    requireCan('payments.record'),
    validate(leaveToCustomerSchema),
    controller.leaveToCustomer,
  );
  const mayWriteOff = requireCan('visits.writeOff');
  router.post(
    '/visits/:visitId/write-off',
    mayWriteOff,
    validate(writeOffVisitSchema),
    controller.writeOffVisit,
  );
  router.delete('/visits/:visitId/write-off', mayWriteOff, controller.undoWriteOff);
  return router;
}
