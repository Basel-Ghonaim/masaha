import type { OccupancyReport } from '@masaha/shared/finance';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFinanceRepository } from '../../repository/financeRepository';
import { financeKeys } from '../queryKeys';

const repository = createFinanceRepository();

/** A month's occupancy statistics; `month` none for the current Gaza month, read only while `enabled`. */
export function useOccupancyQuery(spaceId: number, month: string | undefined, enabled = true) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<OccupancyReport, AppError>({
    queryKey: financeKeys.occupancy(spaceId, month ?? 'current'),
    queryFn: () => repository.occupancy(spaceId, month),
    placeholderData: keepPreviousData,
    enabled,
  });
}
