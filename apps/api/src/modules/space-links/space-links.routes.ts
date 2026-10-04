import { Router } from 'express';

import type { RequireAuth } from '../../shared/auth/index.ts';
import type { SpaceLinksController } from './space-links.controller.ts';

/**
 * The signed-in user's own spaces, at /manage/spaces (docs/api/api-contract.md §5). It has no
 * :spaceId, so the space middleware is not on it: it answers only with the caller's own links.
 */
export function createSpaceLinksMeRouter(
  controller: SpaceLinksController,
  requireAuth: RequireAuth,
): Router {
  const router = Router();
  router.get('/', requireAuth(), controller.mySpaces);
  return router;
}
