import type { IssuedTemporaryPassword } from '@masaha/shared/users';
import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';

/**
 * Issues a new temporary password for an account, answered once. The answer is never kept: the
 * mutation is collected as soon as nothing observes it, and the caller resets it once it has taken
 * the password (finding 34).
 */
export function useIssueTemporaryPassword() {
  const repository = createUsersRepository();
  return useMutation<IssuedTemporaryPassword, AppError, number>({
    gcTime: 0,
    mutationFn: (userId) => repository.issueTemporaryPassword(userId),
  });
}
