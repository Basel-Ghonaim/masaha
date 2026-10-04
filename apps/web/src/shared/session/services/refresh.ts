import { AppError, toAppError } from '@shared/errors';
import { appDependencies, type SessionDependencies } from '../repository/dependencies';
import { endSession, establishSession, sessionGeneration } from '../store';

/**
 * Only the server's verdict on the session ends it: a refresh refused with 401, or with 403 because
 * the account is suspended. Another 403 refuses the request, not the session: a cross-site refresh
 * is refused that way and keeps its cookies. A lost connection, a timeout, a 5xx or a 429 says
 * nothing about the session, which may well still be valid.
 */
export function endsSession(error: AppError): boolean {
  return error.status === 401 || (error.status === 403 && error.code === 'ACCOUNT_SUSPENDED');
}

let inFlight: Promise<void> | undefined;

/**
 * Renews the session. One refresh at a time: the restore and the transport's 401 share the same
 * request. On success the store holds the new session before the promise resolves, so the transport
 * reads the new token. A refusal that ends the session (`endsSession`) ends it here and rejects; any
 * other failure leaves the session as it was and rejects. A refresh that succeeds after the session
 * ended, by a sign-out answered first, drops its answer and rejects as `canceled`
 * (docs/frontend/architecture.md §4).
 */
export function refreshSession(dependencies: SessionDependencies = appDependencies): Promise<void> {
  inFlight ??= renew(dependencies).finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

async function renew({ repository, hint }: SessionDependencies): Promise<void> {
  const started = sessionGeneration();
  const session = await repository.refresh().catch((error: unknown) => {
    const failure = toAppError(error);
    if (endsSession(failure)) {
      hint.clear();
      endSession();
    }
    throw failure;
  });
  if (sessionGeneration() !== started) {
    throw new AppError({
      type: 'canceled',
      status: 0,
      message: 'The session ended while it was being refreshed.',
    });
  }
  establishSession(session, { source: 'restore' });
}
