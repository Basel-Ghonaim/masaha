import type { RecoveryPosition, ResetPasswordRequest } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { getSession, refreshSession } from '@shared/session';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecoveryRepository } from '../../repository/recoveryRepository';
import { authKeys } from '../queryKeys';

const repository = createRecoveryRepository();

/**
 * Sets the new password with the link the recovery holds. The recovery has then ended, and so has
 * every session of the account. A session this browser holds may be one of them, or another
 * account's: the hook asks the server, with one refresh, which ends it only if the reset did. It
 * does so in its own callback, which runs even when the page has gone by the time the answer
 * arrives. A refusal that says the recovery moved on reads the position again.
 *
 * The password is the mutation's variables, and a refusal's cause keeps the request that carried it,
 * so the cache keeps neither once the mutation has no observer (`gcTime: 0`), instead of TanStack
 * Query's five minutes.
 */
export function useResetPassword() {
  const queryClient = useQueryClient();
  // The reset answers 204: nothing to hold but that it succeeded.
  return useMutation<unknown, AppError, ResetPasswordRequest>({
    mutationFn: repository.resetPassword,
    gcTime: 0,
    onSuccess: () => {
      queryClient.setQueryData<RecoveryPosition>(authKeys.recovery, { step: 'request' });
      if (getSession().status === 'authenticated') {
        // A refusal has already ended the session; any other failure leaves it to the next refresh.
        refreshSession().catch(() => undefined);
      }
    },
    onError: (error) => {
      if (error.code === 'RECOVERY_INVALID') {
        void queryClient.invalidateQueries({ queryKey: authKeys.recovery });
      }
    },
  });
}
