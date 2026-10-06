import type { ChangePasswordRequest, PasswordChanged } from '@masaha/shared/users';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import type { AppError } from '@shared/errors';
import { getSession, passwordChanged } from '@shared/session';
import { useMutation } from '@tanstack/react-query';
import { createUsersRepository } from '../repository/usersRepository';

const repository = createUsersRepository();

/**
 * Sets a new password. The session goes on with the token the server renewed, and no change
 * pending: the hook hands it over itself, in its own callback, which runs even when the page has
 * gone by the time the answer arrives. It records who started the change, so the token reaches
 * only that user's session, and says the password is saved. Where the user goes next is the place's,
 * which reacts to the session.
 *
 * The passwords are the mutation's variables, and a refusal's cause keeps the request that carried
 * them, so the cache keeps neither once the mutation has no observer (`gcTime: 0`), instead of
 * TanStack Query's five minutes.
 */
export function useChangePassword() {
  return useMutation<PasswordChanged, AppError, ChangePasswordRequest, { userId?: number }>({
    mutationFn: repository.changePassword,
    gcTime: 0,
    onMutate: () => ({ userId: getSession().user?.id }),
    onSuccess: ({ accessToken }, _request, started) => {
      if (started.userId !== undefined) {
        passwordChanged(started.userId, accessToken);
        toast.success(currentCopy().users.passwordChange.saved);
      }
    },
  });
}
