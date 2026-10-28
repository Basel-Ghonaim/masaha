import type {
  PlatformContact,
  PlatformContactRequest,
  StalenessRequest,
  StalenessThresholds,
} from '@masaha/shared/platform-settings';
import type { NewSpaceDefaults } from '@masaha/shared/space-settings';
import type { Request, Response } from 'express';

import { signedIn } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { PlatformSettingsService } from './platform-settings.service.ts';

/** Each of the admin's cards read and saved on its own; each save answers the card as saved. */
export function createPlatformSettingsController(service: PlatformSettingsService) {
  return {
    newSpaceDefaults: async (_req: Request, res: Response) => {
      sendSuccess(res, (await service.newSpaceDefaults()) satisfies NewSpaceDefaults);
    },

    saveNewSpaceDefaults: async (req: Request, res: Response) => {
      const saved = await service.saveNewSpaceDefaults(
        signedIn(req).userId,
        req.body as NewSpaceDefaults,
      );
      sendSuccess(res, saved satisfies NewSpaceDefaults);
    },

    staleness: async (_req: Request, res: Response) => {
      sendSuccess(res, (await service.stalenessThresholds()) satisfies StalenessThresholds);
    },

    saveStaleness: async (req: Request, res: Response) => {
      const saved = await service.saveStaleness(signedIn(req).userId, req.body as StalenessRequest);
      sendSuccess(res, saved satisfies StalenessThresholds);
    },

    contact: async (_req: Request, res: Response) => {
      sendSuccess(res, (await service.contact()) satisfies PlatformContact);
    },

    saveContact: async (req: Request, res: Response) => {
      const saved = await service.saveContact(
        signedIn(req).userId,
        req.body as PlatformContactRequest,
      );
      sendSuccess(res, saved satisfies PlatformContact);
    },
  };
}

export type PlatformSettingsController = ReturnType<typeof createPlatformSettingsController>;
