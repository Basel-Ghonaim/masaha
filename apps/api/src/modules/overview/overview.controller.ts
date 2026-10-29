import type { AdminOverview, OwnerOverview } from '@masaha/shared/overview';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { OverviewService } from './overview.service.ts';

export function createOverviewController(service: OverviewService) {
  return {
    /** 200 with the owner's overview of the route's space. */
    owner: async (req: Request, res: Response) => {
      sendSuccess(res, (await service.owner(spaceOf(req))) satisfies OwnerOverview);
    },

    /** 200 with the admin's overview of the platform. */
    admin: async (_req: Request, res: Response) => {
      sendSuccess(res, (await service.admin()) satisfies AdminOverview);
    },
  };
}

export type OverviewController = ReturnType<typeof createOverviewController>;
