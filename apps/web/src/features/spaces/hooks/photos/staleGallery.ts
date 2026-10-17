import type { AppError } from '@shared/errors';
import type { QueryClient } from '@tanstack/react-query';
import { spacesKeys } from '../queryKeys';

/**
 * A write the server refused as 404 or 409 says the gallery is not what this page shows: it is
 * fetched again, so what is drawn is what the server has. The promise ends with the fetch.
 */
export function staleGallery(
  client: QueryClient,
  spaceId: number,
  refusal: AppError,
): Promise<void> {
  if (refusal.status !== 404 && refusal.status !== 409) return Promise.resolve();
  return client.invalidateQueries({ queryKey: spacesKeys.photos(spaceId) });
}
