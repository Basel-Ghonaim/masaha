import { useCallback, useState } from 'react';
import type { LinkTarget } from '../../types/LinkTarget';

/** The dialog a person's link actions open, and whose row opened it. */
export type UserLinkDialogState = { kind: 'link'; personId: number; target: LinkTarget };

/**
 * The link actions' open dialog, held by the page above the list, so a row's re-render, the list's
 * refresh or the switch between cards and table never closes it.
 */
export function useUserLinkDialog() {
  const [dialog, setDialog] = useState<UserLinkDialogState | null>(null);
  const close = useCallback(() => {
    setDialog(null);
  }, []);
  return { dialog, open: setDialog, close };
}
