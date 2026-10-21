import type { StaffMember } from '@masaha/shared/space-links';
import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import { useSetStaffActive } from './useSetStaffActive';

/**
 * The deactivation's confirmation, ready to render: its title names the person, and its line says
 * that every session of theirs ends now and they cannot reach the space until their access is given
 * back. A refusal is worded in the dialog, in the owner's words, and it stays open; done, the
 * answer has replaced the row and it closes (`close`), with no toast: the row shows it.
 */
export function useDeactivateDialog(spaceId: number, member: StaffMember, close: () => void) {
  const copy = useCopy().staff;
  const words = copy.deactivate;
  const deactivate = useSetStaffActive(spaceId);
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, words.failed, copy.refusals);

  return {
    title: words.title({ name: isolate(member.name) }),
    description: words.description,
    confirm: {
      label: words.confirm,
      busy: deactivate.isPending,
      blocked,
      run: async () => {
        setRefusal(null);
        try {
          await deactivate.mutateAsync({ userId: member.userId, isActive: false });
          close();
        } catch (error) {
          setRefusal(toAppError(error));
        }
      },
    },
    cancelLabel: words.cancel,
    failure,
  };
}
