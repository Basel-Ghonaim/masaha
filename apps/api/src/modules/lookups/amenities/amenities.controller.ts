import type {
  AdminAmenity,
  CreateAmenityRequest,
  OrderRequest,
  UpdateAmenityRequest,
} from '@masaha/shared/lookups';
import type { Request, Response } from 'express';

import { signedIn } from '../../../shared/auth/index.ts';
import { sendNoContent, sendSuccess } from '../../../shared/http/index.ts';
import { parseId } from '../../../shared/validation/index.ts';
import type { AmenitiesService } from './amenities.service.ts';

export function createAmenitiesController(amenities: AmenitiesService) {
  return {
    list: async (_req: Request, res: Response) => {
      sendSuccess(res, (await amenities.list()) satisfies AdminAmenity[]);
    },

    add: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const amenity = await amenities.add(userId, req.body as CreateAmenityRequest);
      sendSuccess(res, amenity satisfies AdminAmenity, { status: 201 });
    },

    update: async (req: Request, res: Response) => {
      const { userId } = signedIn(req);
      const amenity = await amenities.update(
        userId,
        parseId(req.params.id),
        req.body as UpdateAmenityRequest,
      );
      sendSuccess(res, amenity satisfies AdminAmenity);
    },

    reorder: async (req: Request, res: Response) => {
      await amenities.reorder((req.body as OrderRequest).ids);
      sendNoContent(res);
    },
  };
}

export type AmenitiesController = ReturnType<typeof createAmenitiesController>;
