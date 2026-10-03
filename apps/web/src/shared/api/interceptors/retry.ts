import {
  CanceledError,
  isAxiosError,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { stateOf, withState } from './requestState';

/** The retries after the first attempt. */
export const RETRY_LIMIT = 2;
/** The wait before the first retry; each later wait doubles it. */
export const FIRST_RETRY_DELAY_MS = 1_000;

// The failures with no answer that a re-send may cure. A cancellation is the caller's choice: never.
const TRANSIENT_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']);

/**
 * The one place a request is retried (docs/frontend/architecture.md §7): a GET, or a request that
 * carries an Idempotency-Key, which the server answers once (ADR 0015); on a 5xx, a network failure or
 * a timeout; with backoff, a fixed number of times. A 4xx is the server's answer, 429 included, and is
 * never retried.
 */
export function installRetry(client: AxiosInstance): () => void {
  const id = client.interceptors.response.use(undefined, async (error: unknown) => {
    // Only a raw Axios error: an AppError comes out of a re-send's own chain, already handled there.
    if (!isAxiosError(error) || !isResendable(error) || !isTransient(error)) throw error;
    const { config } = error;
    if (!config) throw error;
    const retries = stateOf(config).retries ?? 0;
    if (retries >= RETRY_LIMIT) throw error;

    await wait(FIRST_RETRY_DELAY_MS * 2 ** retries, config);
    return client.request(withState(config, { retries: retries + 1 }));
  });
  return () => {
    client.interceptors.response.eject(id);
  };
}

function isResendable({ config }: AxiosError): boolean {
  return config?.method === 'get' || config?.headers.has('Idempotency-Key') === true;
}

function isTransient({ response, code }: AxiosError): boolean {
  if (response) return response.status >= 500;
  return code !== undefined && TRANSIENT_CODES.has(code);
}

/**
 * Waits before a retry. A request cancelled meanwhile stops waiting at once and fails as canceled, as
 * Axios fails a cancelled request, leaving no timer behind.
 */
function wait(ms: number, config: InternalAxiosRequestConfig): Promise<void> {
  const { signal } = config;
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new CanceledError(undefined, undefined, config));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', cancel);
      resolve();
    }, ms);
    if (signal?.aborted) cancel();
    else signal?.addEventListener?.('abort', cancel, { once: true });
  });
}
