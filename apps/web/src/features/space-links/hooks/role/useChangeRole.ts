import type { AdminRoleChoice } from '@masaha/shared/space-links';
import { toast } from '@shared/design-system';
import { currentCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { isolate } from '@shared/localisation';
import { useMutation } from '@tanstack/react-query';
import { createSpaceLinksRepository } from '../../repository/spaceLinksRepository';
import { useRefreshAdmin } from '../useRefreshAdmin';

/**
 * Makes a person an admin, or a user again. It stays pending until the admin's views have arrived
 * again, then says so, naming the person; their sessions ended on the server.
 */
export function useChangeRole() {
  const refresh = useRefreshAdmin();
  const repository = createSpaceLinksRepository();
  return useMutation<undefined, AppError, { userId: number; name: string; role: AdminRoleChoice }>({
    mutationFn: ({ userId, role }) => repository.changeRole(userId, role),
    onSuccess: async (_answer, { name, role }) => {
      await refresh();
      const lines = currentCopy().spaceLinks.role;
      toast(
        role === 'ADMIN'
          ? lines.nowAdmin({ name: isolate(name) })
          : lines.nowUser({ name: isolate(name) }),
      );
    },
  });
}
