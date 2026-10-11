import { adminSpacesQuerySchema, adminUsersQuerySchema } from '@masaha/shared/space-links';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AdminSpacesController } from './admin-spaces/adminSpaces.controller.ts';
import type { AdminUsersController } from './admin-users/adminUsers.controller.ts';

export interface SpaceLinksAdminControllers {
  adminSpaces: AdminSpacesController;
  adminUsers: AdminUsersController;
}

/**
 * The admin's spaces list, at /admin/spaces, and users list, at /admin/users
 * (docs/api/api-contract.md §5, Spaces (the admin) and Users (the admin)). The composition root
 * mounts it under /admin, behind requireAuth and requireRole('ADMIN').
 */
export function createSpaceLinksAdminRouter({
  adminSpaces,
  adminUsers,
}: SpaceLinksAdminControllers): Router {
  const router = Router();
  router.get('/spaces', validate(adminSpacesQuerySchema, 'query'), adminSpaces.list);
  router.get('/users', validate(adminUsersQuerySchema, 'query'), adminUsers.list);
  return router;
}
