import type { LookupsCatalogue } from '@masaha/shared/lookups';
import type { Request, Response } from 'express';

import { sendSuccess } from '../../../shared/http/index.ts';
import type { CatalogueService } from './catalogue.service.ts';

export function createCatalogueController(catalogue: CatalogueService) {
  return {
    read: async (_req: Request, res: Response) => {
      sendSuccess(res, (await catalogue.catalogue()) satisfies LookupsCatalogue);
    },
  };
}

export type CatalogueController = ReturnType<typeof createCatalogueController>;
