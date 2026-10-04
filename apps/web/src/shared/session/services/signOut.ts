import { appDependencies, type SessionDependencies } from '../repository/dependencies';
import { endSession } from '../store';

/**
 * Signs out on the server, which is the source of truth; only then does the session end here. A failed
 * request clears nothing: the refresh cookie would still be valid, so ending the session here alone
 * would be false. The failure rejects, for the user to retry.
 */
export async function signOut({ repository, hint }: SessionDependencies = appDependencies) {
  await repository.logout();
  hint.clear();
  endSession();
}
