import type { AdminSpace, UpdateSpaceContactsRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { ContactsService } from './contacts.service.ts';

export function createContactsController(service: ContactsService) {
  return {
    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await service.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpaceContactsRequest,
      );
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type ContactsController = ReturnType<typeof createContactsController>;
