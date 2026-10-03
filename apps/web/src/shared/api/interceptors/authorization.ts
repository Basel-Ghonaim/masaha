import type { AxiosInstance } from 'axios';
import { markState, stateOf } from './requestState';

/**
 * Sends the session's access token: on every attempt, the getter's current one, so a retry or a replay
 * never carries a token that was renewed or ended while it waited; no header when the getter returns
 * null. The transport owns only the header it set: one the caller set is left alone.
 */
export function installAuthorization(
  client: AxiosInstance,
  getAccessToken: () => string | null,
): () => void {
  const id = client.interceptors.request.use((config) => {
    const callerSet = config.headers.has('Authorization') && !stateOf(config).sessionToken;
    if (callerSet) return config;

    const token = getAccessToken();
    if (token === null) {
      config.headers.delete('Authorization');
      markState(config, { sessionToken: false });
    } else {
      config.headers.set('Authorization', `Bearer ${token}`);
      markState(config, { sessionToken: true });
    }
    return config;
  });
  return () => {
    client.interceptors.request.eject(id);
  };
}
