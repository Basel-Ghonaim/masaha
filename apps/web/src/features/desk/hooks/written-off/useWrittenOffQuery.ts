import type { WrittenOffVisit } from '@masaha/shared/visits';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * The owner's page of the written-off visits, read while its view is shown (reception is refused
 * it); read again after any desk write (S2), the page before shown while the next loads.
 */
export function useWrittenOffQuery(spaceId: number, page: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<WrittenOffVisit[]>, AppError>({
    queryKey: deskKeys.writtenOff(spaceId, page),
    queryFn: () => repository.writtenOff(spaceId, page),
    placeholderData: keepPreviousData,
  });
}
