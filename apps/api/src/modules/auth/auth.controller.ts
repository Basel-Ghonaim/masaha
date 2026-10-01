import type { LoginRequest, RegisterRequest } from '@masaha/shared';
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

    logout: async (req: Request, res: Response) => {
      await auth.logout(cookies.read(req));
      cookies.clear(res);
      sendNoContent(res);
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
