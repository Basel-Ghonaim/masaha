import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { ConfirmService } from './confirm.service.ts';

export function createConfirmController(service: ConfirmService) {
  return {
    /** The handler that confirms `group`: each group has its own route. */
    confirm: (group: FactGroup) => async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await service.confirm({ id: userId, role }, spaceOf(req), group);
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type ConfirmController = ReturnType<typeof createConfirmController>;
