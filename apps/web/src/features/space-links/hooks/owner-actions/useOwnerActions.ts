import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import { namedLine } from '../../services/namedLine';
import type { OwnerDialog } from '../../types/OwnerDialog';
import type { UserRowView } from '../../types/UserRowView';

/**
 * An owner's row actions, ready to render: the menu's button, named after the owner; «ربط بمساحة»,
 * which a suspended account cannot take, its reason said under it; and «فك الربط من …» once per
 * space of theirs, each asking first. The dialog chosen opens from the menu.
 */
export function useOwnerActions(row: UserRowView) {
  const copy = useCopy();
  const lines = copy.spaceLinks.ownerActions;
  const [dialog, setDialog] = useState<OwnerDialog | null>(null);
  const owner = { id: row.id, name: row.name };
  // The row's spaces, each named as the row names it (in the server's order), with its id.
  const spaces = row.row.spaces.map((space, index) => ({
    id: space.id,
    name: row.spaces[index] ?? { text: space.nameEn },
  }));
  const suspended = row.row.isSuspended;

  return {
    // An accessible name is one string, so the name in it is isolated rather than marked.
    trigger: { label: lines.menu({ name: isolate(row.name) }) },
    link: {
      label: lines.link,
      disabled: suspended,
      reason: suspended ? lines.suspended : undefined,
      open: () => {
        setDialog({
          kind: 'link',
          target: {
            from: 'person',
            person: {
              ...owner,
              role: 'OWNER',
              spaceIds: spaces.map((space) => space.id),
              deskIds: row.row.receptionSpaces.map((desk) => desk.id),
            },
          },
        });
      },
    },
    unlinks: spaces.map((space) => ({
      key: space.id,
      label: namedLine(({ name }) => lines.unlinkFrom({ space: name }), space.name),
      open: () => {
        setDialog({ kind: 'unlink', space, owner });
      },
    })),
    dialog,
    close: () => {
      setDialog(null);
    },
  };
}
