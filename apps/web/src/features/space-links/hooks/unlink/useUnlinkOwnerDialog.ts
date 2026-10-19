import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import { namedLine } from '../../services/namedLine';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';
import { useSpaceOwnersQuery } from './useSpaceOwnersQuery';
import { useUnlinkOwner } from './useUnlinkOwner';

/** The space an unlink ends a link to, and the owner it ends. */
export type UnlinkSubject = {
  space: { id: number; name: SpaceNameView };
  owner: { id: number; name: string };
};

/**
 * The unlink's confirmation, ready to render. Its consequence is said from the space's owners as the
 * server reads them when it opens: the last owner leaves the space unverified, others leave it
 * verified; while they are read the line waits and so does the action; if the read fails, a line
 * true either way. A read already in the cache, from an earlier opening, is never taken for this
 * one's: while the owners are fetched again, the line and the action wait too. The person's own role is never predicted (a deleted space's link still counts for
 * it). A refusal shows inside, and it stays open; unlinked, it closes (`close`).
 */
export function useUnlinkOwnerDialog({ space, owner }: UnlinkSubject, close: () => void) {
  const copy = useCopy();
  const lines = copy.spaceLinks.unlink;
  const owners = useSpaceOwnersQuery(space.id);
  const unlink = useUnlinkOwner();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed, lines.refusals);

  // Only this opening's read counts: a cached answer refetching, or kept after a failed refetch, does not.
  const reading = owners.isFetching;
  const read = reading || owners.isError ? undefined : owners.data;
  const others = read?.filter((candidate) => candidate.id !== owner.id);
  const last = others !== undefined && others.length === 0;

  return {
    title: namedLine(
      ({ name }) => lines.title({ person: isolate(owner.name), space: name }),
      space.name,
    ),
    consequence: reading
      ? null
      : others === undefined
        ? lines.ifLast
        : last
          ? namedLine(({ name }) => lines.lastOwner({ space: name }), space.name)
          : lines.othersStay,
    confirm: {
      label: lines.confirm,
      busy: unlink.isPending,
      disabled: reading || blocked,
      run: async () => {
        setRefusal(null);
        try {
          await unlink.mutateAsync({
            spaceId: space.id,
            userId: owner.id,
            toast: { person: owner.name, space: space.name, last },
          });
          close();
        } catch (error) {
          setRefusal(toAppError(error));
        }
      },
    },
    cancelLabel: lines.cancel,
    failure,
  };
}
