import type { AppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { spacesKeys } from '../queryKeys';

/**
 * Records a 429's wait as the time the actions on spaces may act again: now plus the wait it asked
 * for, or the time already recorded when that is later. It is kept until it is read past, whatever
 * rows or pages come and go meanwhile. Any other refusal records nothing.
 */
export function useRecordHold() {
  const queryClient = useQueryClient();

  return (refusal: AppError) => {
    if (refusal.type !== 'rate_limit' || refusal.retryAfterSeconds === undefined) return;
    const until = Date.now() + refusal.retryAfterSeconds * 1000;
    // Kept however long the wait, with no page reading it meanwhile.
    queryClient.setQueryDefaults(spacesKeys.hold, { gcTime: Infinity, staleTime: Infinity });
    queryClient.setQueryData<number | null>(spacesKeys.hold, (current) =>
      Math.max(current ?? 0, until),
    );
  };
}
