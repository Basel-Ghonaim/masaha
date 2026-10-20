import type { RefObject } from 'react';
import type { AccountDialogState } from '../../hooks/account-actions/useAccountDialog';
import { IssuePasswordDialog } from '../issue-password/IssuePasswordDialog';
import { SuspendDialog } from '../suspend/SuspendDialog';

/**
 * The dialog a person's account actions opened, rendered by the page above the list so it outlives
 * the closed menu, the row's re-render and the switch between cards and table: the suspension's, or
 * the temporary password's, whose one-time password must never be lost to either. Closed, the focus
 * returns to the person's menu button as it is then (`returnFocus`).
 */
export function AccountActionDialog({
  dialog,
  onClose,
  returnFocus,
}: {
  dialog: AccountDialogState;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  return dialog.kind === 'suspend' ? (
    <SuspendDialog person={dialog.person} onClose={onClose} returnFocus={returnFocus} />
  ) : (
    <IssuePasswordDialog person={dialog.person} onClose={onClose} returnFocus={returnFocus} />
  );
}
