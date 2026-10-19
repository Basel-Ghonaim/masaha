import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { currentCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { toastNamed } from '../../components/toast/namedToast';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { namedLine } from '../../services/namedLine';
import { useRefreshAdmin } from '../useRefreshAdmin';
import type { AddOwnerRequest, AddedOwner } from '@masaha/shared/space-links';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';

export function useAddOwner() {
  const refresh = useRefreshAdmin();
  const repository = createSpaceLinksRepository();
  return useMutation<
    AddedOwner,
    AppError,
    { request: AddOwnerRequest; spaceName: SpaceNameView; personName: string }
  >({
    gcTime: 0,
    mutationFn: ({ request }) => repository.addOwner(request),
    onSuccess: async (answer, { spaceName, personName }) => {
      await refresh();
      if (answer.temporaryPassword === null) {
        const lines = currentCopy().spaceLinks.addOwner;
        // The person's name isolated, the space's its own element, marked with its language.
        toastNamed(
          namedLine(
            ({ name }) => lines.upgraded({ name: isolate(personName), space: name }),
            spaceName,
          ),
        );
      }
    },
  });
}
