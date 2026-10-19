import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import { toastNamed } from '../../components/toast/namedToast';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { namedLine } from '../../services/namedLine';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';
import { useRefreshAdmin } from '../useRefreshAdmin';

/** What the unlink's toast names: the person, the space, and whether they were its last owner. */
type UnlinkToast = { person: string; space: SpaceNameView; last: boolean };

/**
 * Ends a person's owner link to a space. It stays pending until the admin's views have arrived again,
 * then says so, and that the space is unverified now when they were its last owner.
 */
export function useUnlinkOwner() {
  const refresh = useRefreshAdmin();
  const repository = createSpaceLinksRepository();
  return useMutation<undefined, AppError, { spaceId: number; userId: number; toast: UnlinkToast }>({
    gcTime: 0,
    mutationFn: ({ spaceId, userId }) => repository.unlinkOwner(spaceId, userId),
    onSuccess: async (_answer, { toast }) => {
      await refresh();
      const lines = currentCopy().spaceLinks.unlink;
      toastNamed(
        namedLine(
          ({ name }) => lines.unlinked({ person: isolate(toast.person), space: name }),
          toast.space,
        ),
        toast.last ? lines.nowUnverified : undefined,
      );
    },
  });
}
