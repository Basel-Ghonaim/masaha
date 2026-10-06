import { Router } from 'express';

import type { CatalogueController } from './catalogue/catalogue.controller.ts';

/** The public lookups, at /lookups (docs/api/api-contract.md §5, Lookups (public)): no guard. */
export function createLookupsPublicRouter(catalogue: CatalogueController): Router {
  const router = Router();
  router.get('/', catalogue.read);
  return router;
}
