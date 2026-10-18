import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
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
        toast(lines.upgraded({ name: personName, space: spaceName.text }));
      }
    },
  });
}
