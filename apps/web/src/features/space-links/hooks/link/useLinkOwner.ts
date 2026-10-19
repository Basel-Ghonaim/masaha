import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import { toastNamed } from '../../components/toast/namedToast';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { namedLine } from '../../services/namedLine';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';
import { useRefreshAdmin } from '../useRefreshAdmin';

/** What the link's toast names: the person, the space, and whether the space was verified before. */
type LinkToast = { person: string; space: SpaceNameView; wasVerified: boolean };

/**
 * Links a person to a space as its owner. It stays pending until the admin's views have arrived
 * again — the lists and the space's editor, whose verification the link changes — then says so, and
 * that the space is verified now when it was not.
 */
export function useLinkOwner() {
  const refresh = useRefreshAdmin();
  const repository = createSpaceLinksRepository();
  return useMutation<undefined, AppError, { spaceId: number; userId: number; toast: LinkToast }>({
    gcTime: 0,
    mutationFn: ({ spaceId, userId }) => repository.linkOwner(spaceId, userId),
    onSuccess: async (_answer, { toast }) => {
      await refresh();
      const lines = currentCopy().spaceLinks.link;
      toastNamed(
        namedLine(
          ({ name }) => lines.linked({ person: isolate(toast.person), space: name }),
          toast.space,
        ),
        toast.wasVerified ? undefined : lines.nowVerified,
      );
    },
  });
}
