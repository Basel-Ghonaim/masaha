import type { DirectoryRequest } from '../types/DirectoryRequest';
import type { FavoritesRequest } from '../types/FavoritesRequest';
import type { NearPoint } from '../types/NearState';
import type { PinsRequest } from '../types/PinsRequest';

/** The capability's query keys, under the public scope (docs/frontend/architecture.md §7). */
export const directoryKeys = {
  all: ['public', 'directory'] as const,
  /** A page of the list, one key per request and the point it is ordered from, if any. */
  list: (request: DirectoryRequest, near: NearPoint | null) =>
    ['public', 'directory', 'list', request, near] as const,
  /** The map's pins, one key per request. */
  pins: (request: PinsRequest) => ['public', 'directory', 'pins', request] as const,
  /** A space's page, by its slug. */
  space: (slug: string) => ['public', 'directory', 'space', slug] as const,
  status: (slug: string) => ['public', 'directory', 'status', slug] as const,
  /**
   * The signed-in user's favourites, under the session's scope: `{}` newest saved first (the hearts'
   * ids), `{ near }` nearest first. A favourite saved or removed reads the whole scope again (S13).
   */
  favorites: (request: FavoritesRequest) => ['me', 'favorites', request] as const,
};

/** Whether a key of the user's favourites holds a point: an answer ordered by distance from it. */
export function isNearFavorites(key: readonly unknown[]): boolean {
  const request = key[2];
  return (
    key[1] === 'favorites' && typeof request === 'object' && request !== null && 'near' in request
  );
}

/** Whether a list's key holds a point: an answer ordered by distance, dropped with the location. */
export function hasNear(key: readonly unknown[]): boolean {
  return key[2] === 'list' && key[4] !== null && key[4] !== undefined;
}
