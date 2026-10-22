import type { PublicOccupancy } from '@masaha/shared/occupancy';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createDirectoryRepository } from '../../repository/directoryRepository';
import { directoryKeys } from '../queryKeys';

const repository = createDirectoryRepository();

/** The space page's live status, refreshed while visible and immediately on returning. */
export function useLiveStatusQuery(slug: string) {
  return useQuery<PublicOccupancy, AppError>({
    queryKey: directoryKeys.status(slug),
    queryFn: () => repository.status(slug),
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });
}
