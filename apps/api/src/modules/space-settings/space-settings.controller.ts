import type { SpaceSettings, UpdateSpaceSettingsRequest } from '@masaha/shared/space-settings';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { SpaceSettingsService } from './space-settings.service.ts';

export function createSpaceSettingsController(service: SpaceSettingsService) {
  return {
    read: async (req: Request, res: Response) => {
      const settings = await service.read(spaceOf(req).id);
      sendSuccess(res, settings satisfies SpaceSettings);
    },

    update: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const edited = await service.update(
        { id: userId, role },
        spaceOf(req),
        req.body as UpdateSpaceSettingsRequest,
      );
      sendSuccess(res, edited satisfies SpaceSettings);
    },
  };
}

export type SpaceSettingsController = ReturnType<typeof createSpaceSettingsController>;
