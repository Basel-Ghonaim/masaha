import { setCapacitySchema, setStatusOverrideSchema } from '@masaha/shared/occupancy';
import { Router } from 'express';

import { requireCan } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { OccupancyController } from './occupancy.controller.ts';

/**
 * The managed occupancy router, mounted below `/manage/spaces/:spaceId`, behind that boundary:
 * without an active `OWNER` or `RECEPTION` link at the live space, the caller never reaches it
 * (docs/backend/security.md › Authorization). The state now is the staff's: the boundary is its
 * check. The override's routes are the staff's and the capacity's the owner's: each asks `can()`
 * here first, before a body is read, and each write asks it again under the space's lock.
 */
export function createOccupancyManageRouter(controller: OccupancyController): Router {
  const router = Router();
  router.get('/occupancy', controller.now);
  const mayManageCapacity = requireCan('space.capacity.manage');
  router.get('/capacity', mayManageCapacity, controller.capacity);
  router.put('/capacity', mayManageCapacity, validate(setCapacitySchema), controller.setCapacity);
  const mayOverride = requireCan('space.liveStatus.override');
  router.put(
    '/status-override',
    mayOverride,
    validate(setStatusOverrideSchema),
    controller.setOverride,
  );
  router.delete('/status-override', mayOverride, controller.clearOverride);
  return router;
}
