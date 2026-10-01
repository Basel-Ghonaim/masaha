import {
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resetCheckSchema,
  resetPasswordSchema,
} from '@masaha/shared';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { AuthController } from './auth.controller.ts';

/**
 * The public router, at /auth (docs/api/api-contract.md §5). The sign-in limits count failures
 * only, so the service applies them where a failure is decided.
 */
export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post('/register', validate(registerSchema), controller.register);
  router.post('/login', validate(loginSchema), controller.login);
  router.post('/google', validate(googleSignInSchema), controller.google);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.post('/password/forgot', validate(forgotPasswordSchema), controller.forgotPassword);
  router.post('/password/reset/check', validate(resetCheckSchema), controller.checkResetToken);
  router.post('/password/reset', validate(resetPasswordSchema), controller.resetPassword);
  return router;
}
