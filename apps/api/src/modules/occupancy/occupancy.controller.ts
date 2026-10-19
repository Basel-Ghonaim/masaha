import type { SetCapacityRequest, SpaceCapacity } from '@masaha/shared/occupancy';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { OccupancyService } from './occupancy.service.ts';

export function createOccupancyController(service: OccupancyService) {
  return {
    capacity: async (req: Request, res: Response) => {
      const capacity = await service.capacity(spaceOf(req).id);
      sendSuccess(res, capacity satisfies SpaceCapacity);
    },

    setCapacity: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const set = await service.setCapacity(
        { id: userId, role },
        spaceOf(req),
        req.body as SetCapacityRequest,
      );
      sendSuccess(res, set satisfies SpaceCapacity);
    },
  };
}

export type OccupancyController = ReturnType<typeof createOccupancyController>;
