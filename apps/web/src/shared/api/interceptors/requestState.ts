import type { InternalAxiosRequestConfig } from 'axios';

/** What the interceptors note on a request between its attempts. */
type RequestState = {
  /** The retries already made (retry.ts). */
  retries?: number;
  /** The request is the replay after a refresh (refreshOn401.ts). */
  replayed?: boolean;
  /** The transport set the Authorization header, not the caller (authorization.ts). */
  sessionToken?: boolean;
};

// Axios copies a config key it does not know onto every re-send, so the state rides with the request.
type WithState = InternalAxiosRequestConfig & { transportState?: RequestState };

export function stateOf(config: InternalAxiosRequestConfig): RequestState {
  return (config as WithState).transportState ?? {};
}

/** A copy of the config, for a re-send, with its state changed. */
export function withState(
  config: InternalAxiosRequestConfig,
  change: RequestState,
): InternalAxiosRequestConfig {
  const next: WithState = { ...config, transportState: { ...stateOf(config), ...change } };
  return next;
}

/** Changes the state of the attempt being sent, from a request interceptor. */
export function markState(config: InternalAxiosRequestConfig, change: RequestState): void {
  (config as WithState).transportState = { ...stateOf(config), ...change };
}
