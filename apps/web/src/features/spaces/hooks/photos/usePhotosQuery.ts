import type { SpacePhoto } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';

/**
 * One space's photos, in the gallery's order; the first is the cover. Photos are no fact group, so
 * this key is their own and nothing else under `['admin']` is marked out of date by a change here.
 */
export function usePhotosQuery(place: EditorPlace, spaceId: number) {
  const scope = EDITOR_SCOPES[place];
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<SpacePhoto[], AppError>({
    queryKey: scope.photosKey(spaceId),
    queryFn: () => scope.repository.listPhotos(spaceId),
  });
}
