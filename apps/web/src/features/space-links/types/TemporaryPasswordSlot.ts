import type { ReactNode, RefObject } from 'react';

/** A new owner's account, as the sheet hands it to the password dialog. */
export type AddedOwnerView = {
  userId: number;
  name: string;
  email: string;
  temporaryPassword: string;
};

/**
 * How a page shows the one-time password dialog for an added owner; once done, the dialog returns
 * the focus to `returnFocus`, «إضافة مالك», since the sheet that held it is gone.
 */
export type TemporaryPasswordSlot = (
  added: AddedOwnerView,
  done: () => void,
  returnFocus: RefObject<HTMLElement | null>,
) => ReactNode;
