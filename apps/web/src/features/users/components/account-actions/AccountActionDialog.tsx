import type { RefObject } from 'react';
import type { AccountDialogState } from '../../hooks/account-actions/useAccountDialog';
import { SuspendDialog } from '../suspend/SuspendDialog';

/**
 * The dialog a person's account actions opened, rendered by the page above the list so it outlives
 * the closed menu, the row's re-render and the switch between cards and table: the suspension's.
 * Closed, the focus returns to the person's menu button as it is then (`returnFocus`).
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
  return <SuspendDialog person={dialog.person} onClose={onClose} returnFocus={returnFocus} />;
}
