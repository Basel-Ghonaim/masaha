import type {
  Announcement,
  CreateAnnouncementRequest,
  EditAnnouncementRequest,
} from '@masaha/shared/announcements';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { idempotencyKeyOf, sendSuccess } from '../../shared/http/index.ts';
import { parseId } from '../../shared/validation/index.ts';
import type { AnnouncementsService } from './announcements.service.ts';

export function createAnnouncementsController(service: AnnouncementsService) {
  return {
    /** 201 every time, a retry included, with the announcement as it is now. */
    create: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const created = await service.create(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as CreateAnnouncementRequest,
      );
      sendSuccess(res, created satisfies Announcement, { status: 201 });
    },

    edit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const edited = await service.edit(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.announcementId),
        req.body as EditAnnouncementRequest,
      );
      sendSuccess(res, edited satisfies Announcement);
    },
  };
}

export type AnnouncementsController = ReturnType<typeof createAnnouncementsController>;
