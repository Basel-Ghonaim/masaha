import type { ReactNode } from 'react';
import { useRouteError } from 'react-router';
import { classifyRouteError } from './classifyRouteError';
import { reloadPage } from './reloadPage';
import { RetryState } from './RetryState';

/**
 * A route's error boundary: offline when the page's code could not arrive or the connection is
 * gone, the general error otherwise. "Try again" reloads the page; offline, so does the connection
 * coming back. `children` are the shell's other ways on, after "Try again".
 */
export function RouteErrorState({ children }: { children?: ReactNode }) {
  return (
    <RetryState kind={classifyRouteError(useRouteError(), navigator.onLine)} onRetry={reloadPage}>
      {children}
    </RetryState>
  );
}
