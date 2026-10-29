import {
  addOwnerSchema,
  adminSpacesQuerySchema,
  adminUsersQuerySchema,
  changeRoleSchema,
  linkOwnerSchema,
} from '@masaha/shared/space-links';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AdminOwnersController } from './admin-owners/adminOwners.controller.ts';
import type { AdminRolesController } from './admin-roles/adminRoles.controller.ts';
import type { AdminSpacesController } from './admin-spaces/adminSpaces.controller.ts';
import type { AdminUsersController } from './admin-users/adminUsers.controller.ts';

export interface SpaceLinksAdminControllers {
  adminOwners: AdminOwnersController;
  adminRoles: AdminRolesController;
  adminSpaces: AdminSpacesController;
  adminUsers: AdminUsersController;
}

/**
 * The admin's spaces list, at /admin/spaces, users list and role changes, at /admin/users, and
 * owners, at /admin/owners and /admin/spaces/:spaceId/owners (docs/api/api-contract.md §5, Spaces
 * (the admin), Owners (the admin) and Users (the admin)). The composition root mounts it under /admin,
 * behind requireAuth and requireRole('ADMIN'), after the links loader of the space routes.
 */
export function createSpaceLinksAdminRouter({
  adminOwners,
  adminRoles,
  adminSpaces,
  adminUsers,
}: SpaceLinksAdminControllers): Router {
  const router = Router();
  router.get('/spaces', validate(adminSpacesQuerySchema, 'query'), adminSpaces.list);
  router.get('/users', validate(adminUsersQuerySchema, 'query'), adminUsers.list);
  router.put('/users/:userId/role', validate(changeRoleSchema), adminRoles.change);
  router.post('/owners', validate(addOwnerSchema), adminOwners.add);
  router.post('/spaces/:spaceId/owners', validate(linkOwnerSchema), adminOwners.link);
  router.delete('/spaces/:spaceId/owners/:userId', adminOwners.unlink);
  return router;
}
