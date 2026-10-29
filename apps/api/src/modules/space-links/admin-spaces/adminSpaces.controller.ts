import type { AdminSpaceRow, AdminSpacesQuery } from '@masaha/shared/space-links';
import type { Request, Response } from 'express';

import { buildPaginationMeta, sendSuccess } from '../../../shared/http/index.ts';
import type { AdminSpacesService } from './adminSpaces.service.ts';

export function createAdminSpacesController(adminSpaces: AdminSpacesService) {
  return {
    list: async (req: Request, res: Response) => {
      const query = req.query as unknown as AdminSpacesQuery;
      const { rows, total } = await adminSpaces.list(query);
      sendSuccess(res, rows satisfies AdminSpaceRow[], { meta: buildPaginationMeta(query, total) });
    },
  };
}

export type AdminSpacesController = ReturnType<typeof createAdminSpacesController>;
