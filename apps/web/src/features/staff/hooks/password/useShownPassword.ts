import { useState } from 'react';
import { createStaffRepository } from '../../repository/staffRepository';
import type { ShownPassword } from '../../types/ShownPassword';

const repository = createStaffRepository();

/**
 * The temporary password the staff page shows once, a new account's or one re-issued, until the
 * one-time dialog is done: it lives in this state alone, never in a cache. Its handover is
 * recorded on the space's staff route, the space-links module's, which this capability serves.
 */
export function useShownPassword(spaceId: number) {
  const [shown, setShown] = useState<ShownPassword | null>(null);

  return {
    shown,
    show: (password: Pick<ShownPassword, 'person' | 'password' | 'kind' | 'returnFocus'>) => {
      setShown({
        ...password,
        recordHandover: ({ userId, channel }) => repository.handOver(spaceId, userId, { channel }),
        onDone: () => {
          setShown(null);
        },
      });
    },
  };
}
