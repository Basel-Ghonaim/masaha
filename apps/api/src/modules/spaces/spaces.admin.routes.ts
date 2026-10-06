import {
  createSpaceSchema,
  setSpaceHiddenSchema,
  updateSpaceProfileSchema,
} from '@masaha/shared/spaces';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { ProfileController } from './profile/profile.controller.ts';
import type { SpaceController } from './space/space.controller.ts';

/**
 * The admin's spaces (docs/api/api-contract.md §5, Spaces (the admin)). The composition root mounts
 * it under /admin, behind requireAuth and requireRole('ADMIN'), with the links loader on
 * /spaces/:spaceId before it, so it carries no guard of its own.
 */
export function createSpacesAdminRouter({
  space,
  profile,
}: {
  space: SpaceController;
  profile: ProfileController;
}): Router {
  const router = Router();
  router.post('/spaces', validate(createSpaceSchema), space.create);
  router.get('/spaces/:spaceId', space.get);
  router.patch('/spaces/:spaceId', validate(updateSpaceProfileSchema), profile.update);
  router.put('/spaces/:spaceId/hidden', validate(setSpaceHiddenSchema), space.setHidden);
  router.delete('/spaces/:spaceId', space.remove);
  router.post('/spaces/:spaceId/restore', space.restore);
  return router;
}
