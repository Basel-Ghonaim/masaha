import { createAnnouncementSchema, editAnnouncementSchema } from '@masaha/shared/announcements';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { requireIdempotencyKey } from '../../shared/http/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { AnnouncementsController } from './announcements.controller.ts';

/**
 * The announcements' writes, mounted at `/announcements` below `/manage/spaces/:spaceId`, behind
 * that boundary (docs/backend/security.md › Authorization). Each asks `can()` here first, before its
 * body is read (the post then reads its idempotency key); the service asks `can()` again under the
 * space's lock. The list and its summary show each closure's extension: they are `subscriptions'`.
 */
export function createAnnouncementsManageRouter(controller: AnnouncementsController): Router {
  const router = Router();
  const mayManage = requireCan('announcements.manage');
  router.post(
    '/',
    mayManage,
    requireIdempotencyKey,
    validate(createAnnouncementSchema),
    controller.create,
  );
  router.patch('/:announcementId', mayManage, validate(editAnnouncementSchema), controller.edit);
  return router;
}
