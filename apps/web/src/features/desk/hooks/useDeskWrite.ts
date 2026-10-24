import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * What every desk write shares (S1, S2, S5): once done, the whole space is read again — its people
 * present, its lists — without waiting, so the dialog closes and its toast speaks from the write's
 * own answer at once; a link ended meanwhile (a 404, or a 403 with no code) reads the user's own
 * spaces again, so the switcher and the navigation follow.
 */
export function useDeskWrite() {
  const client = useQueryClient();
  return useMemo(
    () => ({
      settle: (spaceId: number) => {
        void client.invalidateQueries({ queryKey: ['space', spaceId] });
      },
      linkEnded: (error: AppError | null) => {
        if (error?.status === 404 || (error?.status === 403 && error.code === undefined)) {
          void client.invalidateQueries({ queryKey: ['me'] });
        }
      },
    }),
    [client],
  );
}
