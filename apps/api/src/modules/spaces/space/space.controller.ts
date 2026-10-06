import type { AdminSpace, CreateSpaceRequest, SetSpaceHiddenRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import type { SpaceService } from './space.service.ts';

export function createSpaceController(spaces: SpaceService) {
  return {
    create: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const space = await spaces.create(userId, req.body as CreateSpaceRequest);
      sendSuccess(res, space satisfies AdminSpace, { status: 201 });
    },

    get: async (req: Request, res: Response) => {
      sendSuccess(res, (await spaces.get(spaceOf(req))) satisfies AdminSpace);
    },

    setHidden: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const { isHidden } = req.body as SetSpaceHiddenRequest;
      await spaces.setHidden(userId, spaceOf(req).id, isHidden);
      sendNoContent(res);
    },

    remove: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      await spaces.remove(userId, spaceOf(req).id);
      sendNoContent(res);
    },

    restore: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      await spaces.restore(userId, spaceOf(req).id);
      sendNoContent(res);
    },
  };
}

export type SpaceController = ReturnType<typeof createSpaceController>;
