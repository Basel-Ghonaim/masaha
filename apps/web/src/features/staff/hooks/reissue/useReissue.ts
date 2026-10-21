import type { IssuedTemporaryPassword } from '@masaha/shared/users';
import { useLinkEnded } from '@shared/api';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffRepository } from '../../repository/staffRepository';
import { staffKeys } from '../queryKeys';

const repository = createStaffRepository();

/**
 * Issues a staff member a new temporary password, answered once. The answer is never kept: the
 * mutation is collected as soon as nothing observes it, and the caller resets it once it has taken
 * the password (finding 34). The list is read again, for the new expiry.
 */
export function useReissue(spaceId: number) {
  const client = useQueryClient();
  const linkEnded = useLinkEnded();
  return useMutation<IssuedTemporaryPassword, AppError, number>({
    mutationKey: staffKeys.rowWrite(spaceId),
    gcTime: 0,
    mutationFn: (userId) => repository.reissue(spaceId, userId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: staffKeys.list(spaceId) });
    },
    onError: linkEnded,
  });
}
