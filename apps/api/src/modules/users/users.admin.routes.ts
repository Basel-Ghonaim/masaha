import { handoverSchema, setSuspendedSchema } from '@masaha/shared/users';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { UsersController } from './users.controller.ts';

/**
 * The admin's actions on an account, under /admin/users (docs/api/api-contract.md §5, Users (the
 * admin)). The composition root mounts it under /admin, behind requireAuth and requireRole('ADMIN').
 */
export function createUsersAdminRouter(controller: UsersController): Router {
  const router = Router();
  router.post('/users/:userId/temporary-password', controller.issueTemporaryPassword);
  router.post(
    '/users/:userId/temporary-password/handover',
    validate(handoverSchema),
    controller.recordHandover,
  );
  router.put('/users/:userId/suspended', validate(setSuspendedSchema), controller.setSuspended);
  return router;
}
