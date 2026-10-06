import type { AdminSpace, UpdateSpaceProfileRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { ProfileService } from './profile.service.ts';

export function createProfileController(profile: ProfileService) {
  return {
    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await profile.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpaceProfileRequest,
      );
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type ProfileController = ReturnType<typeof createProfileController>;
