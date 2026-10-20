import type { SpacePackage } from '@masaha/shared/packages';
import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { toastRowFailed } from '../../components/toast/packageToasts';
import { createPackagesRepository } from '../../repository/packagesRepository';
import { packagesKeys } from '../queryKeys';

const repository = createPackagesRepository();

/** One row's write: the package offered or paused by its switch, or its shift cleared. */
export type RowWrite = { pkg: SpacePackage; change: { isActive: boolean } | { shiftId: null } };

/**
 * A write on one row of the list, acting at once: the server's answer replaces the package in the
 * list, as the row shows it; a refusal is a toast that stays, naming the package. Which rows wait on
 * one (`pending`, their packages' ids) is read across every write of the space's rows.
 */
export function useRowWrite(spaceId: number) {
  const client = useQueryClient();
  const write = useMutation<SpacePackage, AppError, RowWrite>({
    mutationKey: packagesKeys.rowWrite(spaceId),
    mutationFn: ({ pkg, change }) => repository.update(spaceId, pkg.id, change),
    onSuccess: (answer) => {
      client.setQueryData<SpacePackage[]>(packagesKeys.list(spaceId), (list) =>
        list?.map((pkg) => (pkg.id === answer.id ? answer : pkg)),
      );
    },
    onError: (error, { pkg, change }) => {
      // Worded when it lands, in the language the interface speaks then.
      const words = currentCopy().packages;
      const name = isolate(pkg.name);
      toastRowFailed(
        'isActive' in change ? words.toggleFailed({ name }) : words.clearShiftFailed({ name }),
        error,
      );
    },
  });
  const pending = useMutationState({
    filters: { mutationKey: packagesKeys.rowWrite(spaceId), status: 'pending' },
    select: (mutation) => (mutation.state.variables as RowWrite | undefined)?.pkg.id,
  });

  return { run: write.mutate, pending };
}
