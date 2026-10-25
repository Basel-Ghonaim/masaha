import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { sendNoContent } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { FavoritesService } from './favorites.service.ts';

export function createFavoritesController(service: FavoritesService) {
  return {
    /** 204, a space already saved included. */
    save: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      await service.save({ id: userId, role }, parseId(req.params.spaceId));
      sendNoContent(res);
    },

    /** 204, whether it was saved or not. */
    remove: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      await service.remove({ id: userId, role }, parseId(req.params.spaceId));
      sendNoContent(res);
    },
  };
}

export type FavoritesController = ReturnType<typeof createFavoritesController>;
