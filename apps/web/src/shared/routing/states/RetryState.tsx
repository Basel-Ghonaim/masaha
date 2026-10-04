import { useCopy } from '@shared/copy';
import { Button, CircleAlertIcon, EmptyState, TriangleAlertIcon } from '@shared/design-system';
import { useEffect } from 'react';
import { StatusPage } from './StatusPage';

/**
 * Offline or the general error, with "Try again". Offline, the connection coming back retries too.
 * The caller decides what a retry is: reloading the page, or restoring the session.
 */
export function RetryState({ kind, onRetry }: { kind: 'offline' | 'error'; onRetry: () => void }) {
  const copy = useCopy();

  useEffect(() => {
    if (kind !== 'offline') {
      return;
    }
    const onOnline = () => {
      onRetry();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [kind, onRetry]);

  return (
    <StatusPage>
      <EmptyState
        icon={kind === 'offline' ? <CircleAlertIcon /> : <TriangleAlertIcon />}
        title={copy.status[kind].title}
        titleAs="h1"
        description={copy.status[kind].description}
      >
        <Button
          onClick={() => {
            onRetry();
          }}
        >
          {copy.status.retry}
        </Button>
      </EmptyState>
    </StatusPage>
  );
}
