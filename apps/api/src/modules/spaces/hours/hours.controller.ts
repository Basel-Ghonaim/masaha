import type { AdminSpace, UpdateSpaceHoursRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { HoursService } from './hours.service.ts';

export function createHoursController(service: HoursService) {
  return {
    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await service.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpaceHoursRequest,
      );
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type HoursController = ReturnType<typeof createHoursController>;
