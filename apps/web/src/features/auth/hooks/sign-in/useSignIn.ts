import type { LoginRequest } from '@masaha/shared/auth';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { RETURN_TOAST_ID } from '@shared/routing';
import { establishSession, type Session } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createAuthRepository } from '../../repository/authRepository';

const repository = createAuthRepository();

/**
 * Signs in with an email and a password. The session the server issued is the capability's to hold,
 * so the hook hands it over itself, in its own callback, which runs even when the page has gone by
 * the time the answer arrives, then welcomes the account back («أهلًا بعودتك», C4), in the language
 * the sign-in leaves the interface in. A guest's held action that then runs says its own toast in the
 * welcome's place (`RETURN_TOAST_ID`). What happens next is the place's, which reacts to the session.
 *
 * The password is the mutation's variables, and a refusal's cause keeps the request that carried it,
 * so the cache keeps neither once the mutation has no observer (`gcTime: 0`), instead of TanStack
 * Query's five minutes.
 */
export function useSignIn() {
  return useMutation<Session, AppError, LoginRequest>({
    mutationFn: repository.login,
    gcTime: 0,
    onSuccess: (session) => {
      establishSession(session, { source: 'signIn' });
      toast.success(currentCopy().auth.signIn.welcomeBack, { id: RETURN_TOAST_ID });
    },
  });
}
