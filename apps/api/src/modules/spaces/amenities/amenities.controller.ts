import type { AdminSpace, UpdateSpaceAmenitiesRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { SpaceAmenitiesService } from './amenities.service.ts';

export function createSpaceAmenitiesController(service: SpaceAmenitiesService) {
  return {
    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await service.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpaceAmenitiesRequest,
      );
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type SpaceAmenitiesController = ReturnType<typeof createSpaceAmenitiesController>;
