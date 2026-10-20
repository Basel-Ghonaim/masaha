import type { RefObject } from 'react';
import type { UserLinkDialogState } from '../../hooks/user-actions/useUserLinkDialog';
import { LinkOwnerDialog } from '../link/LinkOwnerDialog';
import { RoleDialog } from '../role/RoleDialog';

/**
 * The dialog a person's link actions opened, rendered by the page above the list so it outlives the
 * closed menu, the row's re-render and the switch between cards and table: the link dialog from the
 * person, or the role change's. Closed, the focus returns to the person's menu button as it is then
 * (`returnFocus`).
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
  return dialog.kind === 'link' ? (
    <LinkOwnerDialog target={dialog.target} onClose={onClose} returnFocus={returnFocus} />
  ) : (
    <RoleDialog person={dialog.person} onClose={onClose} returnFocus={returnFocus} />
  );
}
