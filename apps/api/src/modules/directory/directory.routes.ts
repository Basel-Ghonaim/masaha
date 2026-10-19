import { mapPinsQuerySchema } from '@masaha/shared/directory';
import { Router } from 'express';

import { validate } from '../../shared/validation/index.ts';
import type { DirectoryController } from './directory.controller.ts';
import { validateListQuery } from './listQuery.ts';

/**
 * The public directory, at /spaces, /spaces/:slug, /spaces/:slug/occupancy and /map/spaces
 * (docs/api/api-contract.md §5, Directory (public)): no guard. The map's pins live under /map, since a space's slug could be
 * `pins`.
 */
export function createDirectoryPublicRouter(directory: DirectoryController): Router {
  const router = Router();
  router.get('/spaces', validateListQuery, directory.list);
  router.get('/spaces/:slug', directory.page);
  router.get('/spaces/:slug/occupancy', directory.occupancy);
  router.get('/map/spaces', validate(mapPinsQuerySchema, 'query'), directory.pins);
  return router;
}
