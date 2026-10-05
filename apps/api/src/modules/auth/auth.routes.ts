import {
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resendLinkSchema,
  resetCheckSchema,
  resetPasswordSchema,
} from '@masaha/shared/auth';
import { Router } from 'express';

import { refuseCrossSite } from '../../shared/http/index.ts';
import { validate } from '../../shared/validation/index.ts';
import type { AuthController } from './auth.controller.ts';

/**
 * The public router, at /auth (docs/api/api-contract.md §5). The sign-in limits count failures
 * only, so the service applies them where a failure is decided.
 */
export function createAuthRouter(controller: AuthController, webOrigin: string): Router {
  const router = Router();
  // The routes that act on the session cookie or the recovery cookie refuse another site's request.
  const sameSiteOnly = refuseCrossSite(webOrigin);
  router.post('/register', validate(registerSchema), controller.register);
  router.post('/login', validate(loginSchema), controller.login);
  router.post('/google', validate(googleSignInSchema), controller.google);
  router.post('/refresh', sameSiteOnly, controller.refresh);
  router.post('/logout', sameSiteOnly, controller.logout);
  router.post(
    '/password/forgot',
    sameSiteOnly,
    validate(forgotPasswordSchema),
    controller.forgotPassword,
  );
  router.post(
    '/password/resend',
    sameSiteOnly,
    validate(resendLinkSchema),
    controller.resendResetLink,
  );
  router.get('/password/recovery', sameSiteOnly, controller.recoveryPosition);
  router.post('/password/reset/check', validate(resetCheckSchema), controller.checkResetToken);
  router.post('/password/reset', validate(resetPasswordSchema), controller.resetPassword);
  return router;
}
