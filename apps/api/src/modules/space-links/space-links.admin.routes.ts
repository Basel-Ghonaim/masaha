import { adminSpacesQuerySchema } from '@masaha/shared/space-links';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AdminSpacesController } from './admin-spaces/adminSpaces.controller.ts';

/**
 * The admin's spaces list, at /admin/spaces (docs/api/api-contract.md §5, Spaces (the admin)). The
 * composition root mounts it under /admin, behind requireAuth and requireRole('ADMIN').
 */
export function createSpaceLinksAdminRouter(adminSpaces: AdminSpacesController): Router {
  const router = Router();
  router.get('/spaces', validate(adminSpacesQuerySchema, 'query'), adminSpaces.list);
  return router;
}
