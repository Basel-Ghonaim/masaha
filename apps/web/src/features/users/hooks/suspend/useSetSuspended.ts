import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';
import { useRefreshAdmin } from '../useRefreshAdmin';

/**
 * Suspends an account, or restores it. It stays pending until the admin's views have arrived again,
 * then says so, naming the person.
 */
export function useSetSuspended() {
  const refresh = useRefreshAdmin();
  const repository = createUsersRepository();
  return useMutation<undefined, AppError, { userId: number; name: string; isSuspended: boolean }>({
    mutationFn: ({ userId, isSuspended }) => repository.setSuspended(userId, { isSuspended }),
    onSuccess: async (_answer, { name, isSuspended }) => {
      await refresh();
      const copy = currentCopy().users;
      toast(
        isSuspended
          ? copy.suspend.suspended({ name: isolate(name) })
          : copy.accountActions.restored({ name: isolate(name) }),
      );
    },
  });
}
