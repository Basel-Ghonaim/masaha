import { useCopy } from '@shared/copy';
import { spaceNameOf } from '@shared/lib';
import { lineParts, useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDeleteSpace } from '../delete/useDeleteSpace';
import { useSetSpaceHidden } from '../hide/useSetSpaceHidden';
import { useSpaceActionsHold } from '../hold/useSpaceActionsHold';
import { useSpaceQuery } from './useSpaceQuery';

/**
 * The admin's actions on a space, in its profile's top bar (H4): «إخفاء عن الزوار» or «إظهار للزوار»,
 * at once, with the row's toast and its «تراجع»; and «حذف المساحة», which asks first in the row's
 * dialog («حذف» and «رجوع»), then leads to the deleted spaces (`deletedLink`), where the toast's Undo
 * still restores it. They are the spaces list's own actions, on the space the profile reads; they wait
 * while one is pending or a 429 counts down. None until the space has loaded.
 */
export function useSpaceEditorActions(spaceId: number, deletedLink: string) {
  const copy = useCopy();
  const words = copy.spaces;
  const english = useLanguage() === 'en';
  const query = useSpaceQuery('admin', spaceId);
  const setHidden = useSetSpaceHidden();
  const remove = useDeleteSpace();
  const hold = useSpaceActionsHold();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  // A 404 on a later read means the space is gone; stale data must not keep its actions.
  const space = query.error?.status === 404 ? undefined : query.data;
  if (space === undefined) return null;

  const name = spaceNameOf(space, english);
  const action = { spaceId: space.id, name };
  const waiting = setHidden.isPending || remove.isPending || hold.blocked;
  return {
    menu: words.editor.actions.menu,
    waiting,
    toggle: {
      label: space.isHidden ? words.editor.actions.show : words.editor.actions.hide,
      run: () => {
        setHidden.mutate({ ...action, isHidden: !space.isHidden });
      },
    },
    remove: {
      label: words.editor.actions.delete,
      run: () => {
        setConfirming(true);
      },
    },
    dialog: {
      open: confirming,
      setOpen: setConfirming,
      title: { ...lineParts(words.deleteDialog.title), name },
      description: words.deleteDialog.description,
      cancelLabel: words.deleteDialog.cancel,
      confirmLabel: words.deleteDialog.confirm,
      confirm: () => {
        remove.mutate(action, {
          onSuccess: () => {
            void navigate(deletedLink);
          },
        });
      },
    },
  };
}
