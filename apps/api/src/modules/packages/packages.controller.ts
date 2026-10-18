import type { CreatePackageRequest, SpacePackage } from '@masaha/shared/packages';
import type { Request, Response } from 'express';

import { signedIn, spaceOf } from '../../shared/auth/index.ts';
import { sendSuccess } from '../../shared/http/index.ts';
import type { PackagesService } from './packages.service.ts';

export function createPackagesController(service: PackagesService) {
  return {
    list: async (req: Request, res: Response) => {
      const packages = await service.list(spaceOf(req).id);
      sendSuccess(res, packages satisfies SpacePackage[]);
    },

    create: async (req: Request, res: Response) => {
      const { userId, role } = signedIn(req);
      const created = await service.create(
        { id: userId, role },
        spaceOf(req),
        req.body as CreatePackageRequest,
      );
      sendSuccess(res, created satisfies SpacePackage, { status: 201 });
    },
  };
}

export type PackagesController = ReturnType<typeof createPackagesController>;
