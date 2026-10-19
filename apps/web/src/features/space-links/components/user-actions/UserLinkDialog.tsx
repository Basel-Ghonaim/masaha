import type { RefObject } from 'react';
import type { UserLinkDialogState } from '../../hooks/user-actions/useUserLinkDialog';
import { LinkOwnerDialog } from '../link/LinkOwnerDialog';

/**
 * The dialog a person's link actions opened, rendered by the page above the list so it outlives the
 * closed menu, the row's re-render and the switch between cards and table: the link dialog from the
 * person. Closed, the focus returns to the person's menu button as it is then (`returnFocus`).
 */
export function UserLinkDialog({
  dialog,
  onClose,
  returnFocus,
}: {
  dialog: UserLinkDialogState;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  return <LinkOwnerDialog target={dialog.target} onClose={onClose} returnFocus={returnFocus} />;
}
