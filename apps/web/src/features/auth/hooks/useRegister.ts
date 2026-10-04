import type { RegisterRequest } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { establishSession, type Session } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createAuthRepository } from '../repository/authRepository';

const repository = createAuthRepository();

/**
 * Creates an account and signs it in. The hook holds the session the server issued, in its own
 * callback, as `useSignIn` does.
 */
export function useRegister() {
  return useMutation<Session, AppError, RegisterRequest>({
    mutationFn: repository.register,
    onSuccess: (session) => {
      establishSession(session, { source: 'signIn' });
    },
  });
}
