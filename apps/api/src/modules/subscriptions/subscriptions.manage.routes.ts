import { correctPriceSchema, correctSubscriptionSchema } from '@masaha/shared/subscriptions';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { SubscriptionsController } from './subscriptions.controller.ts';

/**
 * The subscriptions' writes of one module, mounted below `/manage/spaces/:spaceId`, behind that
 * boundary (docs/backend/security.md › Authorization). Each asks `can()` here first, before its body
 * is read; the service asks `can()` again under the space's lock. The corrections of the limits,
 * dates and name and the end are the staff's; the price is the owner's
 * (`subscriptions.correctPrice`). Subscribing and the statement span modules: they are the desk's.
 */
export function createSubscriptionsManageRouter(controller: SubscriptionsController): Router {
  const router = Router();
  const mayManage = requireCan('subscriptions.manage');
  router.patch(
    '/subscriptions/:subscriptionId',
    mayManage,
    validate(correctSubscriptionSchema),
    controller.correct,
  );
  router.put(
    '/subscriptions/:subscriptionId/price',
    requireCan('subscriptions.correctPrice'),
    validate(correctPriceSchema),
    controller.correctPrice,
  );
  router.post('/subscriptions/:subscriptionId/end', mayManage, controller.end);
  return router;
}
