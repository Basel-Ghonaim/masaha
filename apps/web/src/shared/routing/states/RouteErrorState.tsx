import type { ReactNode } from 'react';
import { useLocation, useNavigate, useRouteError } from 'react-router';
import { classifyRouteError } from './classifyRouteError';
import { reloadPage } from './reloadPage';
import { RetryState } from './RetryState';

/** The mark a retry leaves on the address it runs again, kept with the rest of its state. */
const RETRIED = 'masaha.retried';

/** Whether the location's state carries the retry's mark. */
function wasRetried(state: unknown): boolean {
  return typeof state === 'object' && state !== null && RETRIED in state;
}

/**
 * A route's error boundary: offline when the page's code could not arrive or the connection is
 * gone, the general error otherwise. Offline, "Try again" reloads the page (a failed lazy load is
 * kept by the router, so only a fresh page fetches the code again), and so does the connection
 * coming back; for the general error it runs the route again in place (the same address, replaced,
 * marked as retried in its state), and a failure there says «ما زال الخطأ قائمًا. حاول بعد قليل.»
 * (G8.1). `children` are the shell's other ways on, after "Try again".
 */
export function RouteErrorState({ children }: { children?: ReactNode }) {
  const kind = classifyRouteError(useRouteError(), navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const state: unknown = location.state;

  return (
    <RetryState
      kind={kind}
      again={kind === 'error' && wasRetried(state)}
      onRetry={
        kind === 'offline'
          ? reloadPage
          : () => {
              const kept = typeof state === 'object' && state !== null ? state : {};
              void navigate(`${location.pathname}${location.search}${location.hash}`, {
                replace: true,
                preventScrollReset: true,
                state: { ...kept, [RETRIED]: true },
              });
            }
      }
    >
      {children}
    </RetryState>
  );
}
