import {
  createAmenitySchema,
  createAreaSchema,
  createGovernorateSchema,
  orderSchema,
  updateAmenitySchema,
  updateAreaSchema,
  updateGovernorateSchema,
} from '@masaha/shared/lookups';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AmenitiesController } from './amenities/amenities.controller.ts';
import type { AreasController } from './areas/areas.controller.ts';
import type { GovernoratesController } from './governorates/governorates.controller.ts';

/**
 * The admin's lookup lists (docs/api/api-contract.md §5, Lookups). The composition root mounts it
 * under /admin, behind requireAuth and requireRole('ADMIN'), so it carries no guard of its own.
 */
export function createLookupsAdminRouter({
  governorates,
  areas,
  amenities,
}: {
  governorates: GovernoratesController;
  areas: AreasController;
  amenities: AmenitiesController;
}): Router {
  const router = Router();
  router.get('/governorates', governorates.list);
  router.post('/governorates', validate(createGovernorateSchema), governorates.add);
  router.put('/governorates/order', validate(orderSchema), governorates.reorder);
  router.patch('/governorates/:id', validate(updateGovernorateSchema), governorates.update);
  router.put('/governorates/:id/areas/order', validate(orderSchema), areas.reorder);
  router.post('/areas', validate(createAreaSchema), areas.add);
  router.patch('/areas/:id', validate(updateAreaSchema), areas.update);
  router.get('/amenities', amenities.list);
  router.post('/amenities', validate(createAmenitySchema), amenities.add);
  router.put('/amenities/order', validate(orderSchema), amenities.reorder);
  router.patch('/amenities/:id', validate(updateAmenitySchema), amenities.update);
  return router;
}
