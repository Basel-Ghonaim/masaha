import type { SpacePackage } from '@masaha/shared/packages';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createPackagesRepository } from '../../repository/packagesRepository';
import { packagesKeys } from '../queryKeys';

const repository = createPackagesRepository();

/** Every package of the space, retired ones included, in order. */
export function usePackagesQuery(spaceId: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<SpacePackage[], AppError>({
    queryKey: packagesKeys.list(spaceId),
    queryFn: () => repository.list(spaceId),
  });
}
