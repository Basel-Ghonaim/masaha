import type {
  AnnouncementsQuery,
  AnnouncementsSummary,
  ClosureExtension,
  ExtendSubscriptionsRequest,
  ExtensionPreview,
  ManagedAnnouncement,
} from '@masaha/shared/announcements';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { buildPaginationMeta, idempotencyKeyOf, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
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

    /** 200 with the closure's extension, proposed, or as it was applied. */
    preview: async (req: Request, res: Response) => {
      const preview = await service.preview(spaceOf(req).id, parseId(req.params.announcementId));
      sendSuccess(res, preview satisfies ExtensionPreview);
    },

    /** 201 every time, a retry included, with the extension as it was applied. */
    extend: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const extension = await service.extend(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.announcementId),
        idempotencyKeyOf(res),
        req.body as ExtendSubscriptionsRequest,
      );
      sendSuccess(res, extension satisfies ClosureExtension, { status: 201 });
    },
  };
}

export type ClosuresController = ReturnType<typeof createClosuresController>;
