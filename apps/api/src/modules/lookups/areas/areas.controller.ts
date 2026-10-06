import type {
  AdminArea,
  CreateAreaRequest,
  OrderRequest,
  UpdateAreaRequest,
} from '@masaha/shared/lookups';
import type { Request, Response } from 'express';

import { signedIn } from '../../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { AreasService } from './areas.service.ts';

export function createAreasController(areas: AreasService) {
  return {
    add: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const area = await areas.add(userId, req.body as CreateAreaRequest);
      sendSuccess(res, area satisfies AdminArea, { status: 201 });
    },

    update: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const area = await areas.update(
        userId,
        parseId(req.params.id),
        req.body as UpdateAreaRequest,
      );
      sendSuccess(res, area satisfies AdminArea);
    },

    /** The areas of the governorate the path names. */
    reorder: async (req: Request, res: Response) => {
      await areas.reorder(parseId(req.params.id), (req.body as OrderRequest).ids);
      sendNoContent(res);
    },
  };
}

export type AreasController = ReturnType<typeof createAreasController>;
