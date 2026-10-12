import type {
  ChangePasswordRequest,
  HandoverRequest,
  IssuedTemporaryPassword,
  PasswordChanged,
  SetSuspendedRequest,
} from '@masaha/shared/users';
import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { SessionCookies } from '../sessions/index.ts';
import type { UsersService } from './users.service.ts';

export function createUsersController(users: UsersService, cookies: SessionCookies) {
  return {
    changePassword: async (req: Request, res: Response) => {
      const { userId, tokenPendingChange } = signedIn(req);
      const { accessToken, refreshToken } = await users.changePassword(
        userId,
        req.body as ChangePasswordRequest,
        { pendingChange: tokenPendingChange },
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

    issueTemporaryPassword: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const temporaryPassword = await users.issueTemporaryPasswordFor(
        userId,
        parseId(req.params.userId),
      );
      // The temporary password is answered once: no cache keeps the answer.
      res.set('Cache-Control', 'no-store');
      sendSuccess(res, { temporaryPassword } satisfies IssuedTemporaryPassword);
    },

    setSuspended: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const { isSuspended } = req.body as SetSuspendedRequest;
      await users.setSuspended(userId, parseId(req.params.userId), isSuspended);
      sendNoContent(res);
    },
  };
}

export type UsersController = ReturnType<typeof createUsersController>;
