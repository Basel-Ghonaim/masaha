import type { QuotedVisit } from '@masaha/shared/visits';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

// While the check-out is open, its due is read again each minute (S2).
const REFRESH_MS = 60_000;

/** An open visit with what it costs now, read when the check-out opens and each minute while it is. */
export function useQuoteQuery(spaceId: number, visitId: number) {
  return useQuery<QuotedVisit, AppError>({
    queryKey: deskKeys.quote(spaceId, visitId),
    queryFn: () => repository.quote(spaceId, visitId),
    refetchInterval: REFRESH_MS,
    // Each opening reads it anew: a due from a minute ago is never shown as now.
    staleTime: 0,
    gcTime: 0,
  });
}
