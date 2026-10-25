import type { DeskVisit } from '@masaha/shared/visits';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * A page of the visits closed with no charge, read only for whoever may type a price (S5): on
 * arrival and again after any desk write (S2).
 */
export function useUnpricedQuery(spaceId: number, page: number, enabled: boolean) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<DeskVisit[]>, AppError>({
    queryKey: deskKeys.unpriced(spaceId, page),
    queryFn: () => repository.unpriced(spaceId, page),
    enabled,
  });
}
