import { setCapacitySchema } from '@masaha/shared/occupancy';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { OccupancyController } from './occupancy.controller.ts';

/**
 * The managed occupancy router, mounted below `/manage/spaces/:spaceId`, behind that boundary:
 * without an active `OWNER` or `RECEPTION` link at the live space, the caller never reaches it
 * (docs/backend/security.md › Authorization). The state now is the staff's: the boundary is its
 * check. The capacity's routes are the owner's: they ask `can()` here first, before a body is read,
 * and the write asks it again under the space's lock.
 */
export function createOccupancyManageRouter(controller: OccupancyController): Router {
  const router = Router();
  router.get('/occupancy', controller.now);
  const mayManageCapacity = requireCan('space.capacity.manage');
  router.get('/capacity', mayManageCapacity, controller.capacity);
  router.put('/capacity', mayManageCapacity, validate(setCapacitySchema), controller.setCapacity);
  return router;
}
