import type { StaffMember } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { isolate } from '@shared/localisation';
import { useMutationState } from '@tanstack/react-query';
import { toastReactivateFailed } from '../../components/access/accessToasts';
import type { StaffDialog } from '../../types/StaffDialog';
import { staffKeys } from '../queryKeys';
import { useSetStaffActive } from './useSetStaffActive';

/** One item of a staff member's menu: its label, and why it is held when it is. */
export type StaffActionItem = {
  label: string;
  disabled: boolean;
  /** Why the item is held, said under it (foundation §10). */
  reason?: string;
  destructive: boolean;
  run: () => void;
};

/** The person a row action waits on, whichever action it is. */
function personOf(variables: unknown): number | undefined {
  if (typeof variables === 'number') return variables;
  return (variables as { userId?: number } | undefined)?.userId;
}

/**
 * A staff member's row menu, «إجراءات: {name}», ready to render. An active member: «إيقاف وصوله»,
 * destructive, which asks first; «كلمة مرور مؤقتة جديدة», which asks first while a temporary
 * password is pending, else held, its reason said. A deactivated one: «إعادة وصوله», at once, with
 * no toast, the row showing it, or a toast that stays saying why not; the re-issue held until then.
 * While any action of the row waits, the menu's button is busy. A dialog opens where the list holds
 * it (`open`), so it outlives the closed menu and the row.
 */
export function useStaffActions(
  spaceId: number,
  member: StaffMember,
  { open }: { open: (dialog: StaffDialog) => void },
) {
  const copy = useCopy().staff;
  const reactivate = useSetStaffActive(spaceId);
  const waiting = useMutationState({
    filters: { mutationKey: staffKeys.rowWrite(spaceId), status: 'pending' },
    select: (mutation) => personOf(mutation.state.variables),
  });
  const name = isolate(member.name);

  const access: StaffActionItem = member.isActive
    ? {
        label: copy.deactivate.item,
        disabled: false,
        destructive: true,
        run: () => {
          open({ kind: 'deactivate', member });
        },
      }
    : {
        label: copy.reactivate.item,
        disabled: false,
        destructive: false,
        run: () => {
          reactivate.mutate(
            { userId: member.userId, isActive: true },
            {
              onError: (error) => {
                toastReactivateFailed(member.name, error);
              },
            },
          );
        },
      };

  const held = (reason: string): StaffActionItem => ({
    label: copy.reissue.item,
    disabled: true,
    reason,
    destructive: false,
    run: () => undefined,
  });
  const reissue: StaffActionItem = !member.isActive
    ? held(copy.reissue.heldInactive)
    : member.temporaryPassword === null
      ? held(copy.reissue.heldSettled)
      : {
          label: copy.reissue.item,
          disabled: false,
          destructive: false,
          run: () => {
            open({ kind: 'reissue', member });
          },
        };

  return {
    trigger: { label: copy.menu({ name }), busy: waiting.includes(member.userId) },
    items: member.isActive ? [reissue, access] : [access, reissue],
  };
}
