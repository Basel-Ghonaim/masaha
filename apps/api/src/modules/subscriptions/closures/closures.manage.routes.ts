import { announcementsQuerySchema } from '@masaha/shared/announcements';
import { Router } from 'express';

import { validate } from '../../../shared/validation/index.ts';
import type { ClosuresController } from './closures.controller.ts';

/**
 * The managed announcements list and its summary, mounted at `/announcements` below
 * `/manage/spaces/:spaceId`, behind that boundary, beside `announcements`' writes: they show each
 * closure's extension, which is `subscriptions`' (docs/backend/conventions.md §9). Reads of the
 * space's staff, asking no `can()`.
 */
export function createClosuresManageRouter(controller: ClosuresController): Router {
  const router = Router();
  router.get('/', validate(announcementsQuerySchema, 'query'), controller.list);
  router.get('/summary', controller.summary);
  return router;
}
