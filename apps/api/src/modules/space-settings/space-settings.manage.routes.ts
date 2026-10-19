import { updateSpaceSettingsSchema } from '@masaha/shared/space-settings';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { SpaceSettingsController } from './space-settings.controller.ts';

/**
 * The managed settings router, mounted at `/manage/spaces/:spaceId/settings`, behind that boundary:
 * without an active `OWNER` or `RECEPTION` link at the live space, the caller never reaches it
 * (docs/backend/security.md › Authorization). Both routes are the owner's: they ask `can()` here
 * first, before a body is read, and the edit asks it again under the space's lock.
 */
export function createSpaceSettingsManageRouter(controller: SpaceSettingsController): Router {
  const router = Router();
  const mayManage = requireCan('space.settings.manage');
  router.get('/', mayManage, controller.read);
  router.patch('/', mayManage, validate(updateSpaceSettingsSchema), controller.update);
  return router;
}
