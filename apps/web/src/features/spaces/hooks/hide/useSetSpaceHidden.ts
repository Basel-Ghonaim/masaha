import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toastDone, toastFailed } from '../../components/toast/actionToasts';
import { createSpacesRepository } from '../../repository/spacesRepository';
import type { SpaceAction } from '../../types/SpaceAction';
import { useRecordHold } from '../hold/useRecordHold';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { spaceActionKey } from '../mutationKeys';
import { useRefreshAdmin } from '../useRefreshAdmin';

const repository = createSpacesRepository();

/** How long «تراجع» is offered: long enough to read the toast and change one's mind. */
const UNDO_MS = 10_000;

/**
 * Hides a space from the public, or shows it again, pending until the admin's list has arrived
 * again; then a toast says so by its name, with «تراجع», which sends the opposite (P9: reversible,
 * no one else affected); an undo's own toast offers none. A failure's toast names the space too, and a 429's wait
 * holds every row's actions.
 */
export function useSetSpaceHidden() {
  const refresh = useRefreshAdmin();
  const recordHold = useRecordHold();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    undefined,
    AppError,
    SpaceAction & { isHidden: boolean; undoing?: boolean }
  >({
    mutationKey: spaceActionKey('hidden'),
    // Kept only while its row holds it: a 429's wait is recorded on its own (`useRecordHold`).
    gcTime: 0,
    mutationFn: ({ spaceId, isHidden }) => repository.setHidden(spaceId, isHidden),
    onSuccess: async (_answer, action) => {
      // The space's profile, when open, shows whether it is hidden: it reads the space again too.
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: EDITOR_SCOPES.admin.spaceKey(action.spaceId) }),
      ]);
      // Worded when it lands, in the language the interface speaks then.
      const { toasts } = currentCopy().spaces;
      const { name, isHidden, undoing = false } = action;
      toastDone(
        isHidden ? toasts.hidden : toasts.shown,
        name,
        undoing
          ? undefined
          : {
              duration: UNDO_MS,
              action: {
                label: toasts.undo,
                onClick: () => {
                  mutation.mutate({ ...action, isHidden: !isHidden, undoing: true });
                },
              },
            },
      );
    },
    onError: (refusal, { name, isHidden }) => {
      recordHold(refusal);
      const { failures } = currentCopy().spaces;
      toastFailed(isHidden ? failures.hide : failures.show, name, refusal);
    },
  });
  return mutation;
}
