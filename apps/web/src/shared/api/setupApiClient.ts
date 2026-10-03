import type { AxiosInstance } from 'axios';
import { apiClient } from './client';
import { installAuthorization } from './interceptors/authorization';
import { installNormalise } from './interceptors/normalise';
import { installRefreshOn401 } from './interceptors/refreshOn401';
import { installRetry } from './interceptors/retry';

/** What the composition root hands the transport, which never imports the session. */
export type ApiClientDependencies = {
  /** The access token to send, or null when there is none. */
  getAccessToken: () => string | null;
  /** Renews the session, resolving once `getAccessToken` returns the new token; rejects when it cannot. */
  refresh?: () => Promise<void>;
};

/**
 * Installs the interceptors on a client, and returns what removes them.
 *
 * The order is fixed. Axios runs response interceptors in the order they are installed: the retry,
 * then the refresh, both on the raw Axios error, and normalisation last, so every rejection leaves as
 * an AppError. A retry or a replay is a new request through the whole chain.
 */
export function installInterceptors(
  client: AxiosInstance,
  { getAccessToken, refresh }: ApiClientDependencies,
): () => void {
  const ejectors = [
    installAuthorization(client, getAccessToken),
    installRetry(client),
    installRefreshOn401(client, { getAccessToken, refresh }),
    installNormalise(client),
  ];
  return () => {
    for (const eject of ejectors) eject();
  };
}

let teardown: (() => void) | undefined;

/**
 * Wires `apiClient`, at bootstrap. Setting it up again replaces the previous setup, so the
 * interceptors never stack.
 */
export function setupApiClient(dependencies: ApiClientDependencies): void {
  teardown?.();
  teardown = installInterceptors(apiClient, dependencies);
}
