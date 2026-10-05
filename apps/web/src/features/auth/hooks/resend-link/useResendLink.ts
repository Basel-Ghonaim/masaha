import type { RecoveryPosition } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecoveryRepository } from '../../repository/recoveryRepository';
import { authKeys } from '../queryKeys';

const repository = createRecoveryRepository();

/**
 * Asks the recovery for another link, without an email. The recovery's new position is the one the
 * server answered. A refusal that says the recovery moved on, because it ended or spent its resends,
 * reads the position again, so the page shows where it now stands.
 */
export function useResendLink() {
  const queryClient = useQueryClient();
  return useMutation<RecoveryPosition, AppError>({
    mutationFn: () => repository.resendLink(),
    onSuccess: (position) => {
      queryClient.setQueryData(authKeys.recovery, position);
    },
    onError: (error) => {
      if (error.code === 'RECOVERY_INVALID' || error.code === 'RESEND_LIMIT_REACHED') {
        void queryClient.invalidateQueries({ queryKey: authKeys.recovery });
      }
    },
  });
}
