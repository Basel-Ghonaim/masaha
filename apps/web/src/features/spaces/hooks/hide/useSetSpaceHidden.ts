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
 * Hides a space from the public, or shows it again, pending until the admin's list has arrived
 * again; then a toast says so by its name. A failure's toast names the space too, and a 429's wait
 * holds every row's actions.
 */
export function useSetSpaceHidden() {
  const refresh = useRefreshAdmin();
  const recordHold = useRecordHold();

  return useMutation<undefined, AppError, SpaceAction & { isHidden: boolean }>({
    mutationKey: spaceActionKey('hidden'),
    // Kept only while its row holds it: a 429's wait is recorded on its own (`useRecordHold`).
    gcTime: 0,
    mutationFn: ({ spaceId, isHidden }) => repository.setHidden(spaceId, isHidden),
    onSuccess: async (_answer, { name, isHidden }) => {
      await refresh();
      // Worded when it lands, in the language the interface speaks then.
      const { toasts } = currentCopy().spaces;
      toastDone(isHidden ? toasts.hidden : toasts.shown, name);
    },
    onError: (refusal, { name, isHidden }) => {
      recordHold(refusal);
      const { failures } = currentCopy().spaces;
      toastFailed(isHidden ? failures.hide : failures.show, name, refusal);
    },
  });
}
