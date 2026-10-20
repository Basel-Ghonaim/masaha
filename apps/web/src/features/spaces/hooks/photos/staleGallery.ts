import type { AppError } from '@shared/errors';
import type { QueryClient } from '@tanstack/react-query';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';

/**
 * A write the server refused as 404 or 409 says the gallery is not what this page shows: it is
 * fetched again, so what is drawn is what the server has. The promise ends with the fetch.
 */
export function staleGallery(
  client: QueryClient,
  place: EditorPlace,
  spaceId: number,
  refusal: AppError,
): Promise<void> {
  if (refusal.status !== 404 && refusal.status !== 409) return Promise.resolve();
  return client.invalidateQueries({ queryKey: EDITOR_SCOPES[place].photosKey(spaceId) });
}
