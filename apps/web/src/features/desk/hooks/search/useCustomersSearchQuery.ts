import type { CustomerRow, CustomersQuery } from '@masaha/shared/desk';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/** The customers a desk search shows at most, as the design's results do. */
const SEARCH_LIMIT = 6;

/**
 * The first customers a search finds (`q`, already checked), read once typing pauses (S2), nothing
 * while there is no search; the answer before stays shown while the next one loads.
 */
export function useCustomersSearchQuery(spaceId: number, q: string | undefined) {
  const query: CustomersQuery = { q, page: 1, limit: SEARCH_LIMIT };
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<CustomerRow[]>, AppError>({
    queryKey: deskKeys.customers(spaceId, query),
    queryFn: () => repository.customers(spaceId, query),
    enabled: q !== undefined,
    placeholderData: keepPreviousData,
  });
}
