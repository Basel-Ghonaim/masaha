import type { CustomerRow, CustomersQuery } from '@masaha/shared/desk';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/**
 * The first page of the customers a query finds (`q` already checked; `payment`, `limit`), read once
 * typing pauses (S2), nothing while the query is `null`; the answer before stays shown while the
 * next one loads.
 */
export function useCustomersSearchQuery(
  spaceId: number,
  search: Omit<CustomersQuery, 'page'> | null,
) {
  const query: CustomersQuery = { ...(search ?? { limit: 1 }), page: 1 };
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<CustomerRow[]>, AppError>({
    queryKey: deskKeys.customers(spaceId, query),
    queryFn: () => repository.customers(spaceId, query),
    enabled: search !== null,
    placeholderData: keepPreviousData,
  });
}
