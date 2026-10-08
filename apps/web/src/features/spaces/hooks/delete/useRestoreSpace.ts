import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { toastDone, toastFailed } from '../../components/toast/actionToasts';
import { createSpacesRepository } from '../../repository/spacesRepository';
import type { SpaceAction } from '../../types/SpaceAction';
import { useRecordHold } from '../hold/useRecordHold';
import { spaceActionKey } from '../mutationKeys';
import { useRefreshAdmin } from '../useRefreshAdmin';

const repository = createSpacesRepository();

/**
 * Restores a space just deleted, from its toast's Undo, pending until the admin's list has arrived
 * again; then a toast says so by its name. It runs even once the space's row, or the page, has gone:
 * its callbacks are the mutation's. A failure's toast names the space, and a 429's wait holds every
 * row's actions.
 */
export function useRestoreSpace() {
  const refresh = useRefreshAdmin();
  const recordHold = useRecordHold();

  return useMutation<undefined, AppError, SpaceAction>({
    mutationKey: spaceActionKey('restore'),
    gcTime: 0,
    mutationFn: ({ spaceId }) => repository.restore(spaceId),
    onSuccess: async (_answer, { name }) => {
      await refresh();
      toastDone(currentCopy().spaces.toasts.restored, name);
    },
    onError: (refusal, { name }) => {
      recordHold(refusal);
      toastFailed(currentCopy().spaces.failures.restore, name, refusal);
    },
  });
}
