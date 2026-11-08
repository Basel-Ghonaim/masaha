import type { PriceRanges } from '@masaha/shared/directory';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/**
 * Each subscription's lowest and highest price over the listed spaces, the budget's hints: read once
 * a visit, whatever the other filters, under the app's defaults; `undefined` until it arrives or if
 * it fails, when the fields simply have no hint.
 */
export function usePriceRanges(): PriceRanges | undefined {
  return useQuery<PriceRanges, AppError>({
    queryKey: directoryKeys.priceRanges,
    queryFn: () => repository.priceRanges(),
  }).data;
}
