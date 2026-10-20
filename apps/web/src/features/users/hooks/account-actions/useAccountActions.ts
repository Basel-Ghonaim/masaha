import { useCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { toastRestoreFailed } from '../../components/account-actions/accountToasts';
import type { AccountPerson } from '../../types/AccountPerson';
import { useSetSuspended } from '../suspend/useSetSuspended';
import type { AccountDialogState } from './useAccountDialog';

/** One item of a person's menu: its label, and why it is held when it is. */
export type AccountActionItem = {
  label: string;
  disabled: boolean;
  /** Why the item is held, said under it (foundation §10). */
  reason?: string;
  run: () => void;
};

/**
 * A person's account items on the users page, ready for the page's menu: «إيقاف» for an active
 * account, destructive, which asks first; «استرجاع الحساب» for a suspended one, which restores it
 * at once and says so, or says why not in a toast that stays. The dialog chosen is opened where the
 * page holds it (`open`, from `useAccountDialog`), so it outlives the closed menu and the row.
 */
export function useAccountActions(
  person: AccountPerson,
  { open }: { open: (dialog: AccountDialogState) => void },
) {
  const lines = useCopy().users.accountActions;
  const restore = useSetSuspended();

  const state: AccountActionItem & { destructive: boolean } = person.isSuspended
    ? {
        label: lines.restore,
        disabled: false,
        destructive: false,
        run: () => {
          restore.mutate(
            { userId: person.id, name: person.name, isSuspended: false },
            {
              onError: (error) => {
                toastRestoreFailed(person.name, toAppError(error));
              },
            },
          );
        },
      }
    : {
        label: lines.suspend,
        disabled: false,
        destructive: true,
        run: () => {
          open({ kind: 'suspend', person });
        },
      };

  return { state };
}
