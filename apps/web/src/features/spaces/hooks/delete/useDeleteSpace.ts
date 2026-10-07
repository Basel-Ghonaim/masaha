import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { toastDone, toastFailed } from '../../components/toast/actionToasts';
import { createSpacesRepository } from '../../repository/spacesRepository';
import type { SpaceAction } from '../../types/SpaceAction';
import { useRecordHold } from '../hold/useRecordHold';
import { spaceActionKey } from '../mutationKeys';
import { useRefreshAdmin } from '../useRefreshAdmin';
import { useRestoreSpace } from './useRestoreSpace';

const repository = createSpacesRepository();

// Long enough to reach the Undo from the keyboard; the toast also waits while it is hovered.
const UNDO_MS = 10_000;

/**
 * Deletes a space softly, pending until the admin's list has arrived again; then a toast says so by
 * its name, with an Undo that restores that space, the only way the interface restores one. A
 * failure's toast names the space, and a 429's wait holds every row's actions.
 */
export function useDeleteSpace() {
  const refresh = useRefreshAdmin();
  const recordHold = useRecordHold();
  const restore = useRestoreSpace();

  return useMutation<undefined, AppError, SpaceAction>({
    mutationKey: spaceActionKey('delete'),
    gcTime: 0,
    mutationFn: ({ spaceId }) => repository.remove(spaceId),
    onSuccess: async (_answer, action) => {
      await refresh();
      const { toasts } = currentCopy().spaces;
      toastDone(toasts.deleted, action.name, {
        duration: UNDO_MS,
        action: {
          label: toasts.undo,
          onClick: () => {
            // The row is gone, but its restore still runs; once it settles, the restore lets go of
            // it, so the cache keeps no action of a row no longer there.
            void restore
              .mutateAsync(action)
              .catch(() => undefined)
              .finally(() => {
                restore.reset();
              });
          },
        },
      });
    },
    onError: (refusal, { name }) => {
      recordHold(refusal);
      toastFailed(currentCopy().spaces.failures.delete, name, refusal);
    },
  });
}
