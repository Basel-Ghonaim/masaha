import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * What a 404 on a managed space's route does to the signed-in user's own spaces: the managed routes
 * answer a link ended meanwhile so, and the space switcher must stop offering the space, so the
 * user's whole scope (`['me']`, docs/frontend/architecture.md §7) is fetched again. The owner's
 * pages call it on their routes' 404s, as the space editor's 404 does for its own place.
 */
export function useLinkEnded() {
  const client = useQueryClient();
  return useCallback(
    (error: AppError | null) => {
      if (error?.status === 404) void client.invalidateQueries({ queryKey: ['me'] });
    },
    [client],
  );
}
