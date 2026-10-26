import { announcementsQuerySchema, extendSubscriptionsSchema } from '@masaha/shared/announcements';
import { Router } from 'express';

import { requireCan } from '../../../shared/auth/index.ts';
import { requireIdempotencyKey } from '../../../shared/http/index.ts';
import { validate } from '../../../shared/validation/index.ts';
import type { ClosuresController } from './closures.controller.ts';

/**
 * The managed announcements list and its summary, and a closure's extension, mounted at `/announcements` below
 * `/manage/spaces/:spaceId`, behind that boundary, beside `announcements`' writes: they show each
 * closure's extension, which is `subscriptions`' (docs/backend/conventions.md §9). The reads are
 * the space's staff's, asking no `can()`; the extension is the owner's, asked here first, before its
 * key and body are read, and again under the space's lock.
 */
export function createClosuresManageRouter(controller: ClosuresController): Router {
  const router = Router();
  router.get('/', validate(announcementsQuerySchema, 'query'), controller.list);
  router.get('/summary', controller.summary);
  router.get('/:announcementId/extend-subscriptions', controller.preview);
  router.post(
    '/:announcementId/extend-subscriptions',
    requireCan('subscriptions.extendAfterClosure'),
    requireIdempotencyKey,
    validate(extendSubscriptionsSchema),
    controller.extend,
  );
  return router;
}
