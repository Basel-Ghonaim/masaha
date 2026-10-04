import { QueryClient } from '@tanstack/react-query';

export type { QueryClient };

/**
 * The client that holds the server state, with the app's defaults (docs/frontend/architecture.md §7).
 * The app creates one, once.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The transport is the one place a request is retried; retrying here too would multiply.
        retry: false,
        // The front desk refreshes when its window comes back into focus.
        refetchOnWindowFocus: true,
        // Moving between screens within half a minute reuses what was fetched, which spares slow
        // connections a request per screen.
        staleTime: 30_000,
        // A lost connection fails as a network error the screen shows, instead of waiting on
        // navigator.onLine, which stays true on a network with no internet.
        networkMode: 'always',
      },
      mutations: {
        retry: false,
        // Never paused while offline and sent later: there is no offline queue.
        networkMode: 'always',
      },
    },
  });
}
