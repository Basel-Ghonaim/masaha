import { useCopy } from '@shared/copy';
import { Spinner } from '@shared/design-system';
import { restoreSession, type SessionState } from '@shared/session';
import type { ReactNode } from 'react';
import { RetryState } from '../states/RetryState';
import { StatusPage } from '../states/StatusPage';

/** The whole session, for a guard, which decides on its status and user together. */
export function wholeSession(session: SessionState): SessionState {
  return session;
}

function retryRestore() {
  void restoreSession();
}

function RestoringState() {
  const copy = useCopy();

  return (
    <StatusPage>
      <Spinner label={copy.status.loading} className="self-center" />
    </StatusPage>
  );
}

/**
 * What a guard shows while the session is not settled (docs/frontend/architecture.md §2): the
 * spinner while it is restored; offline or the general error, with a retry of the restore, while
 * the server is unreachable. Nothing once it is settled.
 */
export function sessionWait(session: SessionState): ReactNode {
  if (session.status === 'restoring') {
    return <RestoringState />;
  }
  if (session.status === 'unreachable') {
    return <RetryState kind={session.reason} onRetry={retryRestore} />;
  }
  return null;
}
