import { toAppError, type AppError } from '@shared/errors';
import { appDependencies, type SessionDependencies } from '../repository/dependencies';
import type { UnreachableReason } from '../model';
import { endsSession, refreshSession } from './refresh';
import { endSession, markRestoring, markUnreachable, sessionGeneration } from '../store';

/**
 * Restores the session when the app starts, and again on each retry while `unreachable`. It never
 * blocks a render and never rejects (docs/frontend/architecture.md §4):
 * - no hint: `anonymous` at once, with no request;
 * - a refresh that succeeds: `authenticated`;
 * - a refresh refused with 401, or with 403 for a suspended account: `anonymous`, the hint cleared
 *   (by the refresh);
 * - any other failure, another 403 included: `unreachable`, the hint kept, so a cut connection
 *   never signs the user out.
 * A session that ended while the restore waited stays ended.
 */
export async function restoreSession(
  dependencies: SessionDependencies = appDependencies,
): Promise<void> {
  if (!dependencies.hint.isPresent()) {
    endSession();
    return;
  }
  markRestoring();
  const started = sessionGeneration();
  try {
    await refreshSession(dependencies);
  } catch (error) {
    const failure = toAppError(error);
    if (endsSession(failure) || sessionGeneration() !== started) return;
    markUnreachable(reasonOf(failure));
  }
}

/** Offline when no answer came back in time; otherwise the server answered without a verdict. */
function reasonOf({ type }: AppError): UnreachableReason {
  return type === 'network' || type === 'timeout' ? 'offline' : 'error';
}
