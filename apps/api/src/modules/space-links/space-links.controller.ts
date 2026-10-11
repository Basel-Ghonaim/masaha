import type { ManagedSpace } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { SpaceLinksService } from './space-links.service.ts';

export function createSpaceLinksController(spaceLinks: SpaceLinksService) {
  return {
    mySpaces: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      sendSuccess(res, (await spaceLinks.mySpaces(userId)) satisfies ManagedSpace[]);
    },
  };
}

export type SpaceLinksController = ReturnType<typeof createSpaceLinksController>;
