import type { CheckInVisitRequest, DeskVisit } from '@masaha/shared/visits';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { idempotencyKeyOf, sendSuccess } from '../../shared/http/index.ts';
import type { DeskService } from './desk.service.ts';

export function createDeskController(service: DeskService) {
  return {
    /** 201 every time, a retry included; the warnings in `meta` only when there are some. */
    checkInVisit: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const { visit, warnings } = await service.checkInVisit(
        { id: userId, role },
        spaceOf(req),
        idempotencyKeyOf(res),
        req.body as CheckInVisitRequest,
      );
      sendSuccess(res, visit satisfies DeskVisit, {
        status: 201,
        ...(warnings.length > 0 && { meta: { warnings } }),
      });
    },
  };
}

export type DeskController = ReturnType<typeof createDeskController>;
