import type { AdminSpace } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { spacesKeys } from '../queryKeys';

/**
 * What a write on a space does with the server's answer. A write answers the whole space, which is
 * the editor's state: it is kept as the space's, and the rest of the admin's views, such as the
 * spaces list, are only marked out of date, to be fetched again when shown, so the save waits on
 * nothing more. A refusal that says the space changed meanwhile (403: verified; 404: deleted)
 * fetches the space again, so the page shows it as it is now.
 */
export function useSpaceAnswer(spaceId: number) {
  const client = useQueryClient();
  return {
    keep: (space: AdminSpace) => {
      // Marked first, so the answer stored after it stays fresh.
      void client.invalidateQueries({ queryKey: ['admin'], refetchType: 'none' });
      client.setQueryData(spacesKeys.space(spaceId), space);
    },
    refused: (error: AppError) => {
      if (error.status === 403 || error.status === 404) {
        void client.invalidateQueries({ queryKey: spacesKeys.space(spaceId) });
      }
    },
  };
}
