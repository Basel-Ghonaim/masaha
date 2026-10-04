import { toAppError, type AppError } from '@shared/errors';
import { useCallback, useState } from 'react';
import { appDependencies, type SessionDependencies } from './dependencies';
import { signOut } from './signOut';

export type SignOut = {
  /** Signs out; a failure is kept in `error`, never thrown. */
  signOut: () => Promise<void>;
  isPending: boolean;
  /** The last attempt's failure, cleared when the next one starts. */
  error: AppError | null;
};

/** The server-confirmed sign-out, with its pending and error state for the screen that offers it. */
export function useSignOut(dependencies: SessionDependencies = appDependencies): SignOut {
  const [state, setState] = useState<Omit<SignOut, 'signOut'>>({ isPending: false, error: null });

  const run = useCallback(async () => {
    setState({ isPending: true, error: null });
    try {
      await signOut(dependencies);
      setState({ isPending: false, error: null });
    } catch (error) {
      setState({ isPending: false, error: toAppError(error) });
    }
  }, [dependencies]);

  return { signOut: run, ...state };
}
