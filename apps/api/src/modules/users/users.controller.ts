import type { ChangePasswordRequest, HandoverRequest, PasswordChanged } from '@masaha/shared/users';
import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/index.ts';
import { sendNoContent, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { SessionCookies } from '../sessions/index.ts';
import type { UsersService } from './users.service.ts';

/** The signed-in user's claims. Their routes always run behind requireAuth. */
function signedIn(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export function createUsersController(users: UsersService, cookies: SessionCookies) {
  return {
    changePassword: async (req: Request, res: Response) => {
      const { userId, mustChangePassword } = signedIn(req);
      const { accessToken, refreshToken } = await users.changePassword(
        userId,
        req.body as ChangePasswordRequest,
        { pendingChange: mustChangePassword },
      );
      cookies.set(res, refreshToken);
      sendSuccess(res, { accessToken } satisfies PasswordChanged);
    },

    recordHandover: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const { channel } = req.body as HandoverRequest;
      await users.recordHandover(userId, parseId(req.params.userId), channel);
      sendNoContent(res);
    },
  };
}

export type UsersController = ReturnType<typeof createUsersController>;
