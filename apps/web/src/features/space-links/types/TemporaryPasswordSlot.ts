import type { ReactNode } from 'react';

/** A new owner's account, as the sheet hands it to the password dialog. */
export type AddedOwnerView = {
  userId: number;
  name: string;
  email: string;
  temporaryPassword: string;
};

/** How a page shows the one-time password dialog for an added owner. */
export type TemporaryPasswordSlot = (added: AddedOwnerView, done: () => void) => ReactNode;
