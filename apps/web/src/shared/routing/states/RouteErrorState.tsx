import { useRouteError } from 'react-router';
import { classifyRouteError } from './classifyRouteError';
import { reloadPage } from './reloadPage';
import { RetryState } from './RetryState';

/**
 * A route's error boundary: offline when the page's code could not arrive or the connection is
 * gone, the general error otherwise. "Try again" reloads the page; offline, so does the connection
 * coming back.
 */
export function RouteErrorState() {
  return (
    <RetryState kind={classifyRouteError(useRouteError(), navigator.onLine)} onRetry={reloadPage} />
  );
}
