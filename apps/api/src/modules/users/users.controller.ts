import type { ChangePasswordRequest, PasswordChanged } from '@masaha/shared';
import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { SessionCookies } from '../sessions/index.ts';
import type { UsersService } from './users.service.ts';

/** The signed-in user's id. Their routes always run behind requireAuth. */
function signedIn(req: Request): number {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
}

export function createUsersController(users: UsersService, cookies: SessionCookies) {
  return {
    changePassword: async (req: Request, res: Response) => {
      const { accessToken, refreshToken } = await users.changePassword(
        signedIn(req),
        req.body as ChangePasswordRequest,
      );
      cookies.set(res, refreshToken);
      sendSuccess(res, { accessToken } satisfies PasswordChanged);
    },
  };
}

export type UsersController = ReturnType<typeof createUsersController>;
