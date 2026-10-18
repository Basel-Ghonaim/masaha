import type { AppError } from '@shared/errors';
import { useMutation } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';
import type { HandoverChannel, HandoverRequest } from '@masaha/shared/users';

/** Records how a temporary password just shown reached its person. */
export function useHandover() {
  const repository = createUsersRepository();
  return useMutation<undefined, AppError, { userId: number; channel: HandoverChannel }>({
    gcTime: 0,
    mutationFn: ({ userId, channel }) =>
      repository.handOver(userId, { channel } satisfies HandoverRequest),
  });
}
