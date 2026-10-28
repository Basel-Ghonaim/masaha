import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * What every announcements write shares (S12, S3): once done, the whole space is read again — a
 * closure written, ended, started or deleted changes the space's state now, and an extension moves
 * subscriptions' ends — without waiting, so the toast speaks from the write's own answer at once; a
 * link ended meanwhile (a 404, or a 403 with no code) reads the user's own spaces again, so the
 * switcher and the navigation follow.
 */
export function useAnnouncementsWrite() {
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
