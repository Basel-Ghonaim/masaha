import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

/** What the fake server does with a request: answer with a status, or fail with no answer. */
export type FakeAnswer =
  | { status: number; data?: unknown; headers?: Record<string, string> }
  | { failure: 'ERR_NETWORK' | 'ECONNABORTED' | 'ETIMEDOUT' | 'ERR_CANCELED' };

/**
 * Builds the failure Axios's own adapters reject with for this answer, or the response they resolve
 * with: a status outside 2xx rejects, as Axios's default `validateStatus` does.
 */
export function settle(
  answer: FakeAnswer,
  config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() },
): AxiosResponse | AxiosError {
  if ('failure' in answer) {
    return new AxiosError(`Fake failure ${answer.failure}`, answer.failure, config);
  }
  const response: AxiosResponse = {
    status: answer.status,
    statusText: '',
    data: answer.data,
    headers: new AxiosHeaders(answer.headers),
    config,
  };
  if (answer.status >= 200 && answer.status < 300) return response;
  return new AxiosError(
    `Fake status ${String(answer.status)}`,
    answer.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response,
  );
}

/**
 * A fake transport for Axios's `adapter` option, for the unit lane, which has no network. `answer`
 * receives each request and its index among every request made so far; `requests` records them all.
 */
export function fakeAdapter(
  answer: (config: InternalAxiosRequestConfig, index: number) => FakeAnswer | Promise<FakeAnswer>,
) {
  const requests: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    const index = requests.push(config) - 1;
    const outcome = settle(await answer(config, index), config);
    if (outcome instanceof AxiosError) throw outcome;
    return outcome;
  };
  return { adapter, requests };
}
