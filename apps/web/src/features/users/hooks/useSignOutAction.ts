import { useCopy } from '@shared/copy';
import { useSignOut } from '@shared/session';
import type { SignOutFailureView } from '../types/SignOutFailureView';

/**
 * The server-confirmed sign-out, ready to render wherever the account offers it: its label, the
 * action, its pending state, and its failure as text.
 */
export function useSignOutAction() {
  const copy = useCopy();
  const { signOut, isPending, error } = useSignOut();

  return {
    signOutLabel: copy.users.signOut,
    signOut: () => {
      void signOut();
    },
    isPending,
    failure:
      error === null
        ? null
        : ({
            title: copy.users.signOutFailed,
            message: copy.errors[error.code ?? error.type],
          } satisfies SignOutFailureView),
  };
}
