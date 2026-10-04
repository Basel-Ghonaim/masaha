import type { ManagedSpace } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { SpaceLinksService } from './space-links.service.ts';

/** The signed-in user's claims. Their routes always run behind requireAuth. */
function signedIn(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export function createSpaceLinksController(spaceLinks: SpaceLinksService) {
  return {
    mySpaces: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      sendSuccess(res, (await spaceLinks.mySpaces(userId)) satisfies ManagedSpace[]);
    },
  };
}

export type SpaceLinksController = ReturnType<typeof createSpaceLinksController>;
