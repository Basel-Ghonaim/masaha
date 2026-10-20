import { useCopy } from '@shared/copy';
import { toAppError, type AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import { useChangeRole } from './useChangeRole';

/** The person whose role changes: a user made an admin, or an admin made a user again. */
export type RolePerson = { id: number; name: string; role: 'USER' | 'ADMIN' };

/**
 * The role change's confirmation, ready to render: its title and its line say what follows — a user
 * gets every admin power, an admin loses the dashboard, and either way their sessions end — and its
 * action sends the other role. A refusal is worded in the dialog, which stays open; changed, it
 * closes (`close`).
 */
export function useRoleDialog(person: RolePerson, close: () => void) {
  const lines = useCopy().spaceLinks.role;
  const change = useChangeRole();
  const [refusal, setRefusal] = useState<AppError | null>(null);
  const { view: failure, blocked } = useRefusalView(refusal, lines.failed, lines.refusals);
  const toAdmin = person.role === 'USER';
  const name = isolate(person.name);

  return {
    title: toAdmin ? lines.toAdminTitle({ name }) : lines.toUserTitle({ name }),
    line: toAdmin ? lines.toAdminLine : lines.toUserLine,
    confirm: {
      label: toAdmin ? lines.toAdmin : lines.toUser,
      busy: change.isPending,
      blocked,
      run: async () => {
        setRefusal(null);
        try {
          await change.mutateAsync({
            userId: person.id,
            name: person.name,
            role: toAdmin ? 'ADMIN' : 'USER',
          });
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
