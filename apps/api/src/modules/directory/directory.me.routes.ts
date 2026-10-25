import { Router } from 'express';

import type { RequireAuth } from '../../shared/auth/index.ts';
import type { DirectoryController } from './directory.controller.ts';
import { keepNearPrivate, validateFavoritesQuery } from './listQuery.ts';

/**
 * The signed-in user's favourites, as the directory's cards, at /me/favorites
 * (docs/api/api-contract.md §5, Favourites). An answer to a request carrying the point is marked
 * `no-store` first, so even the guard's refusal is never kept (docs/backend/security.md ›
 * Location).
 */
export function createDirectoryMeRouter(
  directory: DirectoryController,
  requireAuth: RequireAuth,
): Router {
  const router = Router();
  router.get(
    '/me/favorites',
    keepNearPrivate,
    requireAuth(),
    validateFavoritesQuery,
    directory.favorites,
  );
  return router;
}
