import type {
  ForgotPasswordRequest,
  GoogleSession,
  GoogleSignInRequest,
  LoginRequest,
  RegisterRequest,
  ResetCheckRequest,
  ResetPasswordRequest,
} from '@masaha/shared';
import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/index.ts';
import { sendNoContent, sendSuccess } from '../../shared/http/index.ts';
import { clientAddress } from '../../shared/rate-limit/index.ts';
import type { SessionCookies } from '../sessions/index.ts';
import type { AuthService, SignedIn } from './auth.service.ts';

export function createAuthController(auth: AuthService, cookies: SessionCookies) {
  function answer(res: Response, { session, refreshToken }: SignedIn, status = 200) {
    cookies.set(res, refreshToken);
    sendSuccess(res, session, { status });
  }

  return {
    register: async (req: Request, res: Response) => {
      answer(res, await auth.register(req.body as RegisterRequest, clientAddress(req.ip)), 201);
    },

    login: async (req: Request, res: Response) => {
      answer(res, await auth.login(req.body as LoginRequest, clientAddress(req.ip)));
    },

    google: async (req: Request, res: Response) => {
      const { session, refreshToken, linked } = await auth.google(
        req.body as GoogleSignInRequest,
        clientAddress(req.ip),
      );
      cookies.set(res, refreshToken);
      sendSuccess(res, { ...session, linked } satisfies GoogleSession);
    },

    refresh: async (req: Request, res: Response) => {
      try {
        answer(res, await auth.refresh(cookies.read(req)));
      } catch (error) {
        // A session that cannot be restored is over on this device; a 429 only waits.
        if (error instanceof AppError && (error.status === 401 || error.status === 403)) {
          cookies.clear(res);
        }
        throw error;
      }
    },

    forgotPassword: async (req: Request, res: Response) => {
      await auth.forgotPassword(req.body as ForgotPasswordRequest, clientAddress(req.ip));
      res.status(202).end();
    },

    checkResetToken: async (req: Request, res: Response) => {
      const { token } = req.body as ResetCheckRequest;
      sendSuccess(res, await auth.checkResetToken(token, clientAddress(req.ip)));
    },

    resetPassword: async (req: Request, res: Response) => {
      await auth.resetPassword(req.body as ResetPasswordRequest, clientAddress(req.ip));
      sendNoContent(res);
    },

    logout: async (req: Request, res: Response) => {
      await auth.logout(cookies.read(req));
      cookies.clear(res);
      sendNoContent(res);
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
