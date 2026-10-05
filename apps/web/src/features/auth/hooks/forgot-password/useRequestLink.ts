import type { ForgotPasswordRequest, RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecoveryRepository } from '../../repository/recoveryRepository';
import { authKeys } from '../queryKeys';

const repository = createRecoveryRepository();

/** Asks for a reset link. The recovery's new position is the one the server answered. */
export function useRequestLink() {
  const queryClient = useQueryClient();
  return useMutation<RecoveryPosition, AppError, ForgotPasswordRequest>({
    mutationFn: repository.requestLink,
    onSuccess: (position) => {
      queryClient.setQueryData(authKeys.recovery, position);
    },
  });
}
