import type { AddedOwner, AddOwnerRequest, LinkOwnerRequest } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { AdminOwnersService } from './adminOwners.service.ts';

export function createAdminOwnersController(owners: AdminOwnersService) {
  return {
    add: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const added = await owners.add(userId, req.body as AddOwnerRequest);
      // The temporary password is answered once: no cache keeps the answer.
      res.set('Cache-Control', 'no-store');
      sendSuccess(res, added satisfies AddedOwner, { status: 201 });
    },

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
