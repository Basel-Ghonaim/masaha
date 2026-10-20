import { useCallback, useState } from 'react';
import type { AccountPerson } from '../../types/AccountPerson';

/** The dialog a person's account actions open, for the person whose row opened it. */
export type AccountDialogState = { kind: 'suspend'; person: AccountPerson };

/**
 * The account actions' open dialog, held by the page above the list, so a row's re-render, the
 * list's refresh or the switch between cards and table never closes it.
 */
export function useAccountDialog() {
  const [dialog, setDialog] = useState<AccountDialogState | null>(null);
  const close = useCallback(() => {
    setDialog(null);
  }, []);
  return { dialog, open: setDialog, close };
}
