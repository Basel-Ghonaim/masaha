import {
  createSpaceSchema,
  FACT_GROUPS,
  setSpaceHiddenSchema,
  updateSpaceHoursSchema,
  updateSpacePricesSchema,
  updateSpaceProfileSchema,
} from '@masaha/shared/spaces';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { ConfirmController } from './confirm/confirm.controller.ts';
import type { HoursController } from './hours/hours.controller.ts';
import type { PricesController } from './prices/prices.controller.ts';
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
  hours,
  prices,
  confirm,
}: {
  space: SpaceController;
  profile: ProfileController;
  hours: HoursController;
  prices: PricesController;
  confirm: ConfirmController;
}): Router {
  const router = Router();
  router.post('/spaces', validate(createSpaceSchema), space.create);
  router.get('/spaces/:spaceId', space.get);
  router.patch('/spaces/:spaceId', validate(updateSpaceProfileSchema), profile.update);
  router.put('/spaces/:spaceId/hidden', validate(setSpaceHiddenSchema), space.setHidden);
  router.delete('/spaces/:spaceId', space.remove);
  router.post('/spaces/:spaceId/restore', space.restore);
  router.put('/spaces/:spaceId/hours', validate(updateSpaceHoursSchema), hours.update);
  router.put('/spaces/:spaceId/prices', validate(updateSpacePricesSchema), prices.update);
  // One route per group, so a group that does not exist is not found.
  for (const group of FACT_GROUPS) {
    router.post(`/spaces/:spaceId/${group}/confirm`, confirm.confirm(group));
  }
  return router;
}
