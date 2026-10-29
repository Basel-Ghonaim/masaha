import type { FavoriteSpace } from '@masaha/shared/directory';
import type { AppError } from '@shared/errors';
import { useSession } from '@shared/session';
import { useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

const NEWEST = {};

/**
 * The ids of the spaces the signed-in user saved, listed or not, which the hearts read (S13): the
 * user's favourites, newest saved first, read only with a session; none (`null`) for a guest, or
 * until they have arrived.
 */
export function useFavoriteIds(): ReadonlySet<number> | null {
  const signedIn = useSession((state) => state.status === 'authenticated');
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<FavoriteSpace[], AppError, ReadonlySet<number>>({
    queryKey: directoryKeys.favorites(NEWEST),
    queryFn: () => repository.favorites(NEWEST),
    enabled: signedIn,
    select: (favorites) => new Set(favorites.map((favorite) => favorite.space.id)),
  });
  return signedIn ? (query.data ?? null) : null;
}
