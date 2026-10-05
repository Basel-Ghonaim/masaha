import { cookieSessionHint } from '../repository/sessionHint';
import { createSessionRepository } from '../repository/sessionRepository';
import { endSession } from '../store';

const repository = createSessionRepository();

/**
 * Signs out on the server, which is the source of truth; only then does the session end here. A failed
 * request clears nothing: the refresh cookie would still be valid, so ending the session here alone
 * would be false. The failure rejects, for the user to retry.
 */
export async function signOut(): Promise<void> {
  await repository.logout();
  cookieSessionHint.clear();
  endSession();
}
