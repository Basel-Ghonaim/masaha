import { api } from '@shared/api';

/** The path of one of the user's favourites, by its space's id. */
const favoritePath = (spaceId: number) => `/me/favorites/${String(spaceId)}`;

/**
 * A signed-in user's favourites on the server (docs/api/api-contract.md §5, Favourites): the save and
 * the removal, each answered 204 with no body. No key: either is idempotent by design (S4). The list
 * is the directory's (`GET /me/favorites`).
 */
export interface FavoritesRepository {
  /** Saves a listed space; one already saved answers as done. */
  save(spaceId: number): Promise<undefined>;
  /** Removes a space, listed or not; one not saved answers as done. */
  remove(spaceId: number): Promise<undefined>;
}

export function createFavoritesRepository(): FavoritesRepository {
  return {
    save: (spaceId) => api.post<undefined>(favoritePath(spaceId)),
    remove: (spaceId) => api.delete<undefined>(favoritePath(spaceId)),
  };
}
