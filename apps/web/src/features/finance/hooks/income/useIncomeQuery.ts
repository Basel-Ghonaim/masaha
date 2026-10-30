import type { IncomeReport } from '@masaha/shared/finance';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFinanceRepository } from '../../repository/financeRepository';
import { financeKeys } from '../queryKeys';

const repository = createFinanceRepository();

/** A month's income; `month` none for the current Gaza month, read only while `enabled`. */
export function useIncomeQuery(spaceId: number, month: string | undefined, enabled = true) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<IncomeReport, AppError>({
    queryKey: financeKeys.income(spaceId, month ?? 'current'),
    queryFn: () => repository.income(spaceId, month),
    placeholderData: keepPreviousData,
    enabled,
  });
}
