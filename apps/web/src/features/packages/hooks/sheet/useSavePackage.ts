import type { CreatePackageRequest, SpacePackage } from '@masaha/shared/packages';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPackagesRepository } from '../../repository/packagesRepository';
import { packagesKeys } from '../queryKeys';

const repository = createPackagesRepository();

/**
 * Saves the sheet's package: adds a new one, or sends an existing one's terms whole (S11), the
 * server writing only what changed. It stays pending until the list has arrived again, so the sheet
 * closes on the list as the server holds it.
 */
export function useSavePackage(spaceId: number, editing: SpacePackage | null) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<SpacePackage, AppError, CreatePackageRequest>({
    mutationFn: (request) =>
      editing === null
        ? repository.create(spaceId, request)
        : repository.update(spaceId, editing.id, request),
    onSuccess: () => client.invalidateQueries({ queryKey: packagesKeys.list(spaceId) }),
    onError: linkEnded,
  });
}
