import type { LoginRequest } from '@masaha/shared/auth';
import type { AppError } from '@shared/errors';
import { establishSession, type Session } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createAuthRepository } from '../repository/authRepository';

const repository = createAuthRepository();

/**
 * Signs in with an email and a password. The session the server issued is the capability's to hold,
 * so the hook hands it over itself, in its own callback, which runs even when the page has gone by
 * the time the answer arrives. What happens next is the place's, which reacts to the session.
 */
export function useSignIn() {
  return useMutation<Session, AppError, LoginRequest>({
    mutationFn: repository.login,
    onSuccess: (session) => {
      establishSession(session, { source: 'signIn' });
    },
  });
}
