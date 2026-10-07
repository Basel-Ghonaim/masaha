import type { AdminSpace, UpdateSpacePricesRequest } from '@masaha/shared/spaces';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../../shared/auth/index.ts';
import { sendSuccess } from '../../../shared/http/index.ts';
import type { PricesService } from './prices.service.ts';

export function createPricesController(service: PricesService) {
  return {
    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const space = await service.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpacePricesRequest,
      );
      sendSuccess(res, space satisfies AdminSpace);
    },
  };
}

export type PricesController = ReturnType<typeof createPricesController>;
