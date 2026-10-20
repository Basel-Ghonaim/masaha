import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import type { AccountPerson } from '../../types/AccountPerson';
import { useSetSuspended } from './useSetSuspended';

/**
 * The suspension's confirmation, ready to render: its title names the person, and its lines say
 * what follows — every session ends and they cannot sign in until restored; an owner's spaces stay
 * verified; a receptionist's desk link is kept. A refusal is worded in the dialog, which stays
 * open; suspended, it closes (`close`).
 */
export function useSuspendDialog(person: AccountPerson, close: () => void) {
  const lines = useCopy().users.suspend;
  const suspend = useSetSuspended();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed, lines.refusals);

  return {
    title: lines.title({ name: isolate(person.name) }),
    lines: [
      lines.line,
      ...(person.ownsSpaces ? [lines.ownerLine] : []),
      ...(person.atDesk ? [lines.deskLine] : []),
    ],
    confirm: {
      label: lines.confirm,
      busy: suspend.isPending,
      blocked,
      run: async () => {
        setRefusal(null);
        try {
          await suspend.mutateAsync({ userId: person.id, name: person.name, isSuspended: true });
          close();
        } catch (error) {
          setRefusal(toAppError(error));
        }
      },
    },
    cancelLabel: lines.cancel,
    failure,
  };
}
