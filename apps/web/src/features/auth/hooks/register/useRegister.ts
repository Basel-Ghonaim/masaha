import type { RegisterRequest } from '@masaha/shared/auth';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { isolated } from '@shared/forms';
import { establishSession, type Session } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createAuthRepository } from '../../repository/authRepository';

const repository = createAuthRepository();

/**
 * Creates an account and signs it in. The hook holds the session the server issued, in its own
 * callback, as `useSignIn` does, then welcomes the account by its name. The words are read once the
 * session is held, so they are in the language the sign-in leaves the interface in.
 */
export function useRegister() {
  return useMutation<Session, AppError, RegisterRequest>({
    mutationFn: repository.register,
    onSuccess: (session) => {
      establishSession(session, { source: 'signIn' });
      toast.success(currentCopy().auth.register.welcome({ name: isolated(session.user.name) }));
    },
  });
}
