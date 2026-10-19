import type {
  SetCapacityRequest,
  SetStatusOverrideRequest,
  SpaceCapacity,
  SpaceOccupancyNow,
} from '@masaha/shared/occupancy';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { OccupancyService } from './occupancy.service.ts';

export function createOccupancyController(service: OccupancyService) {
  return {
    now: async (req: Request, res: Response) => {
      const now = await service.now(spaceOf(req));
      sendSuccess(res, now satisfies SpaceOccupancyNow);
    },

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

    setOverride: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const now = await service.setOverride(
        { id: userId, role },
        spaceOf(req),
        req.body as SetStatusOverrideRequest,
      );
      sendSuccess(res, now satisfies SpaceOccupancyNow);
    },

    clearOverride: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const now = await service.clearOverride({ id: userId, role }, spaceOf(req));
      sendSuccess(res, now satisfies SpaceOccupancyNow);
    },
  };
}

export type OccupancyController = ReturnType<typeof createOccupancyController>;
