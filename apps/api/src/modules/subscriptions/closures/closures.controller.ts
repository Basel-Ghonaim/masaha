import type {
  AnnouncementsQuery,
  AnnouncementsSummary,
  ManagedAnnouncement,
} from '@masaha/shared/announcements';
import type { Request, Response } from 'express';

import { spaceOf } from '../../../shared/auth/index.ts';
import { buildPaginationMeta, sendSuccess } from '../../../shared/http/index.ts';
import type { ClosuresService } from './closures.service.ts';

export function createClosuresController(service: ClosuresService) {
  return {
    /** 200 with a page of one state's announcements and its `meta`. */
    list: async (req: Request, res: Response) => {
      const query = req.query as unknown as AnnouncementsQuery;
      const { rows, total } = await service.page(spaceOf(req).id, query);
      sendSuccess(res, rows satisfies ManagedAnnouncement[], {
        meta: buildPaginationMeta(query, total),
      });
    },

    summary: async (req: Request, res: Response) => {
      const summary = await service.summary(spaceOf(req).id);
      sendSuccess(res, summary satisfies AnnouncementsSummary);
    },
  };
}

export type ClosuresController = ReturnType<typeof createClosuresController>;
