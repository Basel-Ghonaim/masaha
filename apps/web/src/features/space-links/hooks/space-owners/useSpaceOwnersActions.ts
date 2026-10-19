import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import type { RefObject } from 'react';
import type { SpaceNameView } from '../../types/AdminSpaceRowView';
import type { OwnerDialog } from '../../types/OwnerDialog';

/**
 * The space as its editor gives it: its name, whether it is verified, its owners, unsaved changes, and
 * the element that takes the focus when the button that opened a dialog is gone.
 */
export type EditedSpace = {
  id: number;
  name: SpaceNameView;
  isVerified: boolean;
  owners: { id: number; name: string }[];
  unsaved: boolean;
  focusFallback: RefObject<HTMLElement | null>;
};

/**
 * A space's owners' actions in its editor, ready to render: a verified space offers «فك ربط {name}»
 * per owner, each asking first; an unverified one offers «ربط مالك», which waits, saying why, while
 * the editor has unsaved changes, since the link would turn it read-only and drop them. The dialog
 * chosen opens from its button.
 */
export function useSpaceOwnersActions(space: EditedSpace, addOwnerLink: string) {
  const lines = useCopy().spaceLinks.spaceOwners;
  const [dialog, setDialog] = useState<OwnerDialog | null>(null);
  const subject = { id: space.id, name: space.name };

  return {
    verified: space.isVerified,
    // A button's name is one string, so the name in it is isolated.
    unlinks: space.owners.map((owner) => ({
      key: owner.id,
      label: lines.unlink({ name: isolate(owner.name) }),
      open: () => {
        setDialog({ kind: 'unlink', space: subject, owner });
      },
    })),
    link: {
      label: lines.link,
      disabled: space.unsaved,
      reason: space.unsaved ? lines.unsavedReason : undefined,
      open: () => {
        // Marked, not disabled, so it stays in reach: while it waits, it opens nothing.
        if (space.unsaved) return;
        setDialog({ kind: 'link', target: { from: 'space', space: subject, addOwnerLink } });
      },
    },
    dialog,
    close: () => {
      setDialog(null);
    },
  };
}
