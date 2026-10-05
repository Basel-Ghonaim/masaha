import {
  createAreaSchema,
  createGovernorateSchema,
  orderSchema,
  updateAreaSchema,
  updateGovernorateSchema,
} from '@masaha/shared/lookups';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AreasController } from './areas/areas.controller.ts';
import type { GovernoratesController } from './governorates/governorates.controller.ts';

/**
 * The admin's lookup lists (docs/api/api-contract.md §5, Lookups). The composition root mounts it
 * under /admin, behind requireAuth and requireRole('ADMIN'), so it carries no guard of its own.
 */
export function createLookupsAdminRouter({
  governorates,
  areas,
}: {
  governorates: GovernoratesController;
  areas: AreasController;
}): Router {
  const router = Router();
  router.get('/governorates', governorates.list);
  router.post('/governorates', validate(createGovernorateSchema), governorates.add);
  router.put('/governorates/order', validate(orderSchema), governorates.reorder);
  router.patch('/governorates/:id', validate(updateGovernorateSchema), governorates.update);
  router.put('/governorates/:id/areas/order', validate(orderSchema), areas.reorder);
  router.post('/areas', validate(createAreaSchema), areas.add);
  router.patch('/areas/:id', validate(updateAreaSchema), areas.update);
  return router;
}
