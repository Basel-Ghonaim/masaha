import type {
  AdminGovernorate,
  AdminGovernorateWithAreas,
  CreateGovernorateRequest,
  OrderRequest,
  UpdateGovernorateRequest,
} from '@masaha/shared/lookups';
import type { Request, Response } from 'express';

import { signedIn } from '../../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { GovernoratesService } from './governorates.service.ts';

export function createGovernoratesController(governorates: GovernoratesService) {
  return {
    list: async (_req: Request, res: Response) => {
      sendSuccess(res, (await governorates.list()) satisfies AdminGovernorateWithAreas[]);
    },

    add: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const governorate = await governorates.add(userId, req.body as CreateGovernorateRequest);
      sendSuccess(res, governorate satisfies AdminGovernorate, { status: 201 });
    },

    update: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const governorate = await governorates.update(
        userId,
        parseId(req.params.id),
        req.body as UpdateGovernorateRequest,
      );
      sendSuccess(res, governorate satisfies AdminGovernorate);
    },

    reorder: async (req: Request, res: Response) => {
      await governorates.reorder((req.body as OrderRequest).ids);
      sendNoContent(res);
    },
  };
}

export type GovernoratesController = ReturnType<typeof createGovernoratesController>;
