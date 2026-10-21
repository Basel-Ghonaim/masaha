import { useCopy } from '@shared/copy';
import { spaceNameOf } from '@shared/lib';
import { isolate, lineParts, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import type { SpaceRef } from '../../types/SpaceRef';
import { useDeleteSpace } from '../delete/useDeleteSpace';
import { useRestoreSpace } from '../delete/useRestoreSpace';
import { useSetSpaceHidden } from '../hide/useSetSpaceHidden';
import { useSpaceActionsHold } from '../hold/useSpaceActionsHold';

/**
 * A space's row actions, ready to render. A live space's row has a menu: its button, named after the
 * space; Edit; Hide, or Show for a hidden space; and Delete, which asks first in a dialog whose title
 * names the space. A deleted space has one action instead — **Restore**, a button named after the
 * space — since a deleted space has nothing to edit, hide, show or delete, and the way back is to
 * restore it.
 *
 * Either way the actions wait while the row's own action is pending, until the list has arrived
 * again, and while any 429 counts down (the hold); the button stays where it is, busy while its
 * action is, and keeps the focus.
 */
export function useSpaceActionsMenu(space: SpaceRef) {
  const copy = useCopy();
  const lines = copy.spaces;
  const name = spaceNameOf(space, useLanguage() === 'en');
  const setHidden = useSetSpaceHidden();
  const remove = useDeleteSpace();
  const restore = useRestoreSpace();
  const hold = useSpaceActionsHold();
  const [confirming, setConfirming] = useState(false);
  const action = { spaceId: space.id, name };

  // An accessible name is one string, so the name in it is isolated rather than marked.
  if (space.deletedAt !== null) {
    return {
      deleted: true as const,
      trigger: {
        label: lines.menu.restoreNamed({ name: isolate(name.text) }),
        busy: restore.isPending,
      },
      waiting: restore.isPending || hold.blocked,
      restore: {
        label: lines.menu.restore,
        run: () => {
          restore.mutate(action);
        },
      },
    };
  }

  const busy = setHidden.isPending || remove.isPending;
  const hidden = space.isHidden;

  return {
    deleted: false as const,
    trigger: { label: lines.menu.actions({ name: isolate(name.text) }), busy },
    waiting: busy || hold.blocked,
    edit: lines.menu.edit,
    toggle: {
      label: hidden ? lines.menu.show : lines.menu.hide,
      run: () => {
        setHidden.mutate({ ...action, isHidden: !hidden });
      },
    },
    remove: {
      label: lines.menu.delete,
      run: () => {
        setConfirming(true);
      },
    },
    dialog: {
      open: confirming,
      setOpen: setConfirming,
      title: { ...lineParts(lines.deleteDialog.title), name },
      description: lines.deleteDialog.description,
      cancelLabel: lines.deleteDialog.cancel,
      confirmLabel: lines.deleteDialog.confirm,
      confirm: () => {
        remove.mutate(action);
      },
    },
  };
}

/** The confirmation before a space is deleted, as the menu hands it to the dialog. */
export type SpaceDeleteDialog = Extract<
  ReturnType<typeof useSpaceActionsMenu>,
  { deleted: false }
>['dialog'];
