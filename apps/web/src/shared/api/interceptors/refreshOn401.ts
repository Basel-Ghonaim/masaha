import { toAppError } from '@shared/errors';
import { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_PATH } from '../client';
import { stateOf, withState } from './requestState';

type RefreshDependencies = {
  getAccessToken: () => string | null;
  refresh?: (() => Promise<void>) | undefined;
};

/**
 * Renews an expired session, then replays the request, which the authorization interceptor sends with
 * the new token. Every 401 that arrives while a refresh runs waits for that same refresh, so concurrent
 * requests renew the session once. A failed refresh rejects every waiting request with an AppError.
 */
export function installRefreshOn401(
  client: AxiosInstance,
  { getAccessToken, refresh }: RefreshDependencies,
): () => void {
  let refreshing: Promise<void> | undefined;

  const id = client.interceptors.response.use(undefined, async (error: unknown) => {
    // Only a raw Axios error: an AppError comes out of a re-send's own chain, already handled there.
    if (!refresh || !isAxiosError(error) || error.response?.status !== 401) throw error;
    const { config } = error;
    if (!config) throw error;
    // A sign-in, a registration, a refresh, a sign-out or a password call answers 401 for itself.
    if (isAuthCall(client, config)) throw error;
    const state = stateOf(config);
    // A replay that is refused again is not renewed again.
    if (state.replayed) throw error;
    // Only the session's token is renewed. Without one, a 401 is a refused sign-in, not an expired
    // session; a token the caller set is the caller's.
    if (!state.sessionToken) throw error;
    const current = getAccessToken();
    // The session ended while the request was on its way: there is nothing to renew.
    if (current === null) throw error;
    // Sent with a token the session has renewed since: replay with the current one, without renewing
    // again, which would spend a refresh against its rate limit.
    if (config.headers.get('Authorization') !== `Bearer ${current}`) {
      return client.request(withState(config, { replayed: true }));
    }

    refreshing ??= refresh().finally(() => {
      refreshing = undefined;
    });
    try {
      await refreshing;
    } catch (refreshError) {
      throw toAppError(refreshError);
    }

    return client.request(withState(config, { replayed: true }));
  });
  return () => {
    client.interceptors.response.eject(id);
  };
}

/**
 * Whether the request is an auth call, judged on the path it resolves to, so every spelling of it (with
 * or without a leading slash, or a full URL) is recognised. A refresh refused with 401 must never wait
 * for a refresh of its own.
 */
function isAuthCall(client: AxiosInstance, config: InternalAxiosRequestConfig): boolean {
  const { pathname } = new URL(client.getUri(config), 'http://localhost');
  return pathname.startsWith(`${API_BASE_PATH}/auth/`);
}
