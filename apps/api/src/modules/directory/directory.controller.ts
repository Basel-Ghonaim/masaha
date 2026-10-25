import type { DirectoryQuery, FavoriteSpace, MapPinsQuery } from '@masaha/shared/directory';
import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import { cachePrivately, cachePublicly } from './cache.ts';
import type { DirectoryService } from './directory.service.ts';
import { favoritesQueryOf, listQueryOf } from './listQuery.ts';

export function createDirectoryController(directory: DirectoryService) {
  return {
    list: async (_req: Request, res: Response) => {
      const query: DirectoryQuery = listQueryOf(res);
      const { rows, total } = await directory.list(query);
      // An answer ordered from where someone is is theirs alone, and nothing keeps it.
      if (query.near) cachePrivately(res);
      else cachePublicly(res);
      sendSuccess(res, rows, { meta: buildPaginationMeta(query, total) });
    },

    pins: async (req: Request, res: Response) => {
      const query = req.query as unknown as MapPinsQuery;
      const pins = await directory.pins(query);
      cachePublicly(res);
      sendSuccess(res, pins);
    },

    page: async (req: Request, res: Response) => {
      const space = await directory.page(String(req.params.slug));
      cachePublicly(res);
      sendSuccess(res, space);
    },

    /** 200 with the user's favourites, whole; `no-store` was set with the point, if it was sent. */
    favorites: async (req: Request, res: Response) => {
      const { near } = favoritesQueryOf(res);
      const favorites = await directory.favorites(signedIn(req).userId, near);
      sendSuccess(res, favorites satisfies FavoriteSpace[]);
    },

    occupancy: async (req: Request, res: Response) => {
      const occupancy = await directory.occupancy(String(req.params.slug));
      cachePublicly(res);
      sendSuccess(res, occupancy);
    },
  };
}

export type DirectoryController = ReturnType<typeof createDirectoryController>;
