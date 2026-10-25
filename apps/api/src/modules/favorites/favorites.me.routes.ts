import { Router } from 'express';

import type { RequireAuth } from '../../shared/auth/index.ts';
import type { FavoritesController } from './favorites.controller.ts';

/**
 * The signed-in user's favourites, at /me/favorites/:spaceId (docs/api/api-contract.md §5,
 * Favourites): save and remove. Their list is the directory's (`GET /me/favorites`).
 */
export function createFavoritesMeRouter(
  controller: FavoritesController,
  requireAuth: RequireAuth,
): Router {
  const router = Router();
  router.post('/favorites/:spaceId', requireAuth(), controller.save);
  router.delete('/favorites/:spaceId', requireAuth(), controller.remove);
  return router;
}
