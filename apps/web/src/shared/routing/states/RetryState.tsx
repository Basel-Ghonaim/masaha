import { useCopy } from '@shared/copy';
import { Button, EmptyState, TriangleAlertIcon, WifiOffIcon } from '@shared/design-system';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StatusPage } from './StatusPage';

/**
 * Offline or the general error, with "Try again" and the caller's other ways on after it (the
 * site's «الرئيسية»; the dashboard gives none). Offline, the connection coming back retries too, and
 * a retry while the browser still reports no connection says so instead of retrying, announced again
 * on each press: the line is cleared, then said on the next frame (carried 5). The caller decides
 * what a retry is: reloading the page, or restoring the session.
 */
export function RetryState({
  kind,
  onRetry,
  again = false,
  children,
}: {
  kind: 'offline' | 'error';
  onRetry: () => void;
  /** The general error came back after a retry: «ما زال الخطأ قائمًا. حاول بعد قليل.» */
  again?: boolean;
  children?: ReactNode;
}) {
  const copy = useCopy();
  const [trying, setTrying] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);
  const frame = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );

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

  const retry = () => {
    if (kind === 'offline' && !navigator.onLine) {
      // The same words set again change nothing a screen reader hears: clear them first.
      setStillOffline(false);
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        frame.current = undefined;
        setStillOffline(true);
      });
      return;
    }
    setStillOffline(false);
    setTrying(true);
    onRetry();
  };

  return (
    <StatusPage>
      <EmptyState
        icon={kind === 'offline' ? <WifiOffIcon /> : <TriangleAlertIcon />}
        title={copy.status[kind].title}
        titleAs="h1"
        description={copy.status[kind].description}
      >
        <Button loading={trying} onClick={retry}>
          {copy.status.retry}
        </Button>
        {children}
      </EmptyState>
      <p role="status" className="text-center text-body-sm text-muted-foreground">
        {stillOffline ? copy.status.stillOffline : again ? copy.status.stillFailing : null}
      </p>
    </StatusPage>
  );
}
