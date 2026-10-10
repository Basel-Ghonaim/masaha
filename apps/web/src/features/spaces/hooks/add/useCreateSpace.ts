import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';
import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { currentLanguage } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import { toastDone } from '../../components/toast/actionToasts';
import { createSpacesRepository } from '../../repository/spacesRepository';
import { spaceNameOf } from '../../services/spaceName';
import { useRefreshAdmin } from '../useRefreshAdmin';

const repository = createSpacesRepository();

/**
 * Creates a space from its profile, pending until the admin's lists have arrived again: the add page
 * shows none, so the ones it left are fetched too, and the list the admin returns to already holds
 * the new space. Then a toast says so by its name. A refusal is the form's to show.
 */
export function useCreateSpace() {
  const refresh = useRefreshAdmin({ includeInactive: true });

  return useMutation<AdminSpace, AppError, CreateSpaceRequest>({
    mutationFn: (request) => repository.create(request),
    onSuccess: async (space) => {
      await refresh();
      // Worded when it lands, in the language the interface speaks then.
      toastDone(currentCopy().spaces.toasts.added, spaceNameOf(space, currentLanguage() === 'en'));
    },
  });
}
