import type { RecoveryPosition, ResetCheckRequest } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecoveryRepository } from '../../repository/recoveryRepository';
import { authKeys } from '../queryKeys';

const repository = createRecoveryRepository();

/**
 * Checks a reset link's token, which binds the link to the recovery: the position it answers is
 * where the recovery stands. The token is the mutation's only copy, and it is not kept once the
 * mutation is reset (`gcTime: 0`).
 */
export function useCheckResetLink() {
  const queryClient = useQueryClient();
  return useMutation<RecoveryPosition, AppError, ResetCheckRequest>({
    mutationFn: repository.checkLink,
    gcTime: 0,
    onSuccess: (position) => {
      queryClient.setQueryData(authKeys.recovery, position);
    },
  });
}
