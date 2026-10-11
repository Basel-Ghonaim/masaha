import type { LinkOwnerRequest } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendNoContent } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { AdminOwnersService } from './adminOwners.service.ts';

export function createAdminOwnersController(owners: AdminOwnersService) {
  return {
    link: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      await owners.link(userId, spaceOf(req).id, (req.body as LinkOwnerRequest).userId);
      sendNoContent(res);
    },

    unlink: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      await owners.unlink(userId, spaceOf(req).id, parseId(req.params.userId));
      sendNoContent(res);
    },
  };
}

export type AdminOwnersController = ReturnType<typeof createAdminOwnersController>;
