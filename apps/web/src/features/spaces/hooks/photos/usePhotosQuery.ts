import type { SpacePhoto } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createSpacesRepository } from '../../repository/spacesRepository';
import { spacesKeys } from '../queryKeys';

const repository = createSpacesRepository();

/**
 * One space's photos, in the gallery's order; the first is the cover. Photos are no fact group, so
 * this key is their own and nothing else under `['admin']` is marked out of date by a change here.
 */
export function usePhotosQuery(spaceId: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<SpacePhoto[], AppError>({
    queryKey: spacesKeys.photos(spaceId),
    queryFn: () => repository.listPhotos(spaceId),
  });
}
