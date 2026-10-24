import type {
  Announcement,
  CreateAnnouncementRequest,
  EditAnnouncementRequest,
} from '@masaha/shared/announcements';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { idempotencyKeyOf, sendNoContent, sendSuccess } from '../../shared/http/index.ts';
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

    /** 200 with the announcement, ended now, or as it is when it had ended. */
    end: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const ended = await service.end(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.announcementId),
      );
      sendSuccess(res, ended satisfies Announcement);
    },

    /** 200 with the announcement, started now, or as it is when it had started. */
    start: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const started = await service.start(
        { id: userId, role },
        spaceOf(req),
        parseId(req.params.announcementId),
      );
      sendSuccess(res, started satisfies Announcement);
    },

    /** 204, a repeat included. */
    remove: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      await service.remove({ id: userId, role }, spaceOf(req), parseId(req.params.announcementId));
      sendNoContent(res);
    },
  };
}

export type AnnouncementsController = ReturnType<typeof createAnnouncementsController>;
