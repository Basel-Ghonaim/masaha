import type { GoogleSession, GoogleSignInRequest } from '@masaha/shared/auth';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { isolated } from '@shared/forms';
import { establishSession } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createAuthRepository } from '../../repository/authRepository';

const repository = createAuthRepository();

/**
 * Signs in with Google's ID token. The hook holds the session the server issued, in its own callback,
 * as `useSignIn` does. When the sign-in has just linked Google to an existing account, whose password
 * the server removed, it says so until closed (C5; docs/backend/security.md › Sign-in methods); when
 * the sign-in has just created the account, it welcomes it by its name, as registration does
 * (finding 32). The words are read once the session is held, so they are in the language the sign-in
 * leaves the interface in.
 *
 * Google's ID token is the mutation's variables, and a refusal's cause keeps the request that carried
 * it. The server does not make the token single-use, so the cache keeps neither once the mutation has
 * no observer (`gcTime: 0`), instead of TanStack Query's five minutes.
 */
export function useGoogleSignIn() {
  return useMutation<GoogleSession, AppError, GoogleSignInRequest>({
    mutationFn: repository.google,
    gcTime: 0,
    onSuccess: ({ linked, created, ...session }) => {
      establishSession(session, { source: 'signIn' });
      const words = currentCopy().auth;
      if (linked) {
        const { linkedTitle, linkedDescription } = words.google;
        toast.success(linkedTitle, {
          description: linkedDescription,
          duration: Infinity,
          closeButton: true,
        });
      } else if (created) {
        toast.success(words.register.welcome({ name: isolated(session.user.name) }));
      }
    },
  });
}
