import type { SpacePackage } from '@masaha/shared/packages';
import type { Request, Response } from 'express';

import { spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { PackagesService } from './packages.service.ts';

export function createPackagesController(service: PackagesService) {
  return {
    list: async (req: Request, res: Response) => {
      const packages = await service.list(spaceOf(req).id);
      sendSuccess(res, packages satisfies SpacePackage[]);
    },
  };
}

export type PackagesController = ReturnType<typeof createPackagesController>;
