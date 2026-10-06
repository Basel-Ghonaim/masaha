import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { SpaceService } from './space.service.ts';

export function createSpaceController(spaces: SpaceService) {
  return {
    create: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const space = await spaces.create(userId, req.body as CreateSpaceRequest);
      sendSuccess(res, space satisfies AdminSpace, { status: 201 });
    },
  };
}

export type SpaceController = ReturnType<typeof createSpaceController>;
