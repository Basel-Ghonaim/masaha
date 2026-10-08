import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { lineParts } from '../../services/lineParts';
import { spaceNameOf } from '../../services/spaceName';
import type { SpaceRef } from '../../types/SpaceRef';
import { useDeleteSpace } from '../delete/useDeleteSpace';
import { useSetSpaceHidden } from '../hide/useSetSpaceHidden';
import { useSpaceActionsHold } from '../hold/useSpaceActionsHold';

/**
 * A space's row menu, ready to render: its button, named after the space; Hide, or Show for a hidden
 * space; and Delete, which asks first in a dialog whose title names the space. Its items wait while
 * the row's own action is pending, until the list has arrived again, and while any 429 counts down
 * (the hold); its button stays, busy while its action is.
 */
export function useSpaceActionsMenu(space: SpaceRef) {
  const copy = useCopy();
  const lines = copy.spaces;
  const name = spaceNameOf(space, useLanguage() === 'en');
  const setHidden = useSetSpaceHidden();
  const remove = useDeleteSpace();
  const hold = useSpaceActionsHold();
  const [confirming, setConfirming] = useState(false);
  const busy = setHidden.isPending || remove.isPending;
  const action = { spaceId: space.id, name };
  const hidden = space.state === 'hidden';

  return {
    // An accessible name is one string, so the name in it is isolated rather than marked.
    trigger: { label: lines.menu.actions({ name: isolate(name.text) }), busy },
    waiting: busy || hold.blocked,
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
