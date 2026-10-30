import type { Payer, PayersQuery } from '@masaha/shared/finance';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFinanceRepository } from '../../repository/financeRepository';
import { financeKeys } from '../queryKeys';

const repository = createFinanceRepository();

/** A page of who paid in a month. */
export function usePayersQuery(spaceId: number, query: PayersQuery) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<Payer[]>, AppError>({
    queryKey: financeKeys.payers(spaceId, query),
    queryFn: () => repository.payers(spaceId, query),
    placeholderData: keepPreviousData,
  });
}
