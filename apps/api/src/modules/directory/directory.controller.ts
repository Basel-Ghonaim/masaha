import type { DirectoryQuery, MapPinsQuery } from '@masaha/shared/directory';
import type { Request, Response } from 'express';

import { buildPaginationMeta, sendSuccess } from '../../shared/http/index.ts';
import { cachePublicly } from './cache.ts';
import type { DirectoryService } from './directory.service.ts';

export function createDirectoryController(directory: DirectoryService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.query as unknown as DirectoryQuery;
      const { rows, total } = await directory.list(query);
      cachePublicly(res);
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
  };
}

export type DirectoryController = ReturnType<typeof createDirectoryController>;
