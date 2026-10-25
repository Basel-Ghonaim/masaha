import type { UncollectedVisit } from '@masaha/shared/payments';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * A page of the visits closed with something left to collect, read on arrival and again after any
 * desk write (S2); the page before stays shown while the next one loads.
 */
export function useUncollectedQuery(spaceId: number, page: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<UncollectedVisit[]>, AppError>({
    queryKey: deskKeys.uncollected(spaceId, page),
    queryFn: () => repository.uncollected(spaceId, page),
    placeholderData: keepPreviousData,
  });
}
