import type { HandoverChannel } from '@masaha/shared/users';
import type { RefObject } from 'react';

/**
 * A temporary password the staff page shows once, as the one-time password dialog takes it: the
 * person it is for, the password, whether the account is new or the password re-issued, the
 * handover's write on the space's staff route, what ends the dialog, and the control the focus
 * returns to once it is done.
 */
export type ShownPassword = {
  person: { userId: number; name: string; email: string };
  password: string;
  kind: 'created' | 'issued';
  recordHandover: (request: { userId: number; channel: HandoverChannel }) => Promise<unknown>;
  onDone: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};
