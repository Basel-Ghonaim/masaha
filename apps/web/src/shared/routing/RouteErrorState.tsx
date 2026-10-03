import { useCopy } from '@shared/copy';
import { Button, CircleAlertIcon, EmptyState, TriangleAlertIcon } from '@shared/design-system';
import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { classifyRouteError } from './classifyRouteError';
import { reloadPage } from './reloadPage';
import { StatusPage } from './StatusPage';

/**
 * A route's error boundary: offline when the page's code could not arrive or the connection is
 * gone, the general error otherwise. "Try again" reloads the page; offline, so does the connection
 * coming back.
 */
export function RouteErrorState() {
  const copy = useCopy();
  const kind = classifyRouteError(useRouteError(), navigator.onLine);

  useEffect(() => {
    if (kind !== 'offline') {
      return;
    }
    const onOnline = () => {
      reloadPage();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [kind]);

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
            reloadPage();
          }}
        >
          {copy.status.retry}
        </Button>
      </EmptyState>
    </StatusPage>
  );
}
