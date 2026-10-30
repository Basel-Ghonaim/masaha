import type { BalanceRow, DebtsMeta, DebtsQuery } from '@masaha/shared/finance';
import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFinanceRepository } from '../../repository/financeRepository';
import { financeKeys } from '../queryKeys';

const repository = createFinanceRepository();

/** A page of who owes, or who is in credit, with the space's totals and its reminder. */
export function useDebtsQuery(spaceId: number, query: DebtsQuery) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<Page<BalanceRow[], DebtsMeta>, AppError>({
    queryKey: financeKeys.debts(spaceId, query),
    queryFn: () => repository.debts(spaceId, query),
    placeholderData: keepPreviousData,
  });
}
