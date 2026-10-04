import { changePasswordSchema } from '@masaha/shared/users';
import { Router } from 'express';

import type { RequireAuth } from '../../shared/auth/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { UsersController } from './users.controller.ts';

/** The signed-in user's own account, at /me (docs/api/api-contract.md §5). */
export function createUsersMeRouter(controller: UsersController, requireAuth: RequireAuth): Router {
  const router = Router();
  // The forced change itself, so a pending temporary password is let through.
  router.post(
    '/password',
    requireAuth({ allowPendingPasswordChange: true }),
    validate(changePasswordSchema),
    controller.changePassword,
  );
  return router;
}
