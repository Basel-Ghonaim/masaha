import { apiClient, setupApiClient } from '@shared/api';
import { getSession, refreshSession } from '@shared/session';
import { fakeAdapter, type FakeAnswer } from './fakeAdapter';

type Request = ReturnType<typeof fakeAdapter>['requests'][number];

const originalAdapter = apiClient.defaults.adapter;

/**
 * Wires the app's one client as bootstrap does, with a fake server behind it, so a screen's calls go
 * the real way: the hook, the repository, the transport and its interceptors. `answer` receives each
 * request; `requests` records them. Restore the real adapter with `restoreTransport` after each test.
 */
export function fakeTransport(answer: Parameters<typeof fakeAdapter>[0]) {
  setupApiClient({ getAccessToken: () => getSession().accessToken, refresh: refreshSession });
  const fake = fakeAdapter(answer);
  apiClient.defaults.adapter = fake.adapter;
  return fake.requests;
}

export function restoreTransport(): void {
  apiClient.defaults.adapter = originalAdapter;
}

/** The success envelope of an answer (docs/api/api-contract.md §2). */
export function ok(data: unknown, status = 200): FakeAnswer {
  return { status, data: { success: true, data } };
}

/** The error envelope of a refusal, with its request id. */
export function refused(
  status: number,
  error: { type: string; code?: string; errors?: Record<string, string[]> },
  headers: Record<string, string> = {},
): FakeAnswer {
  return {
    status,
    headers: { 'x-request-id': 'req-1', ...headers },
    data: { success: false, error: { message: 'Fake refusal', requestId: 'req-1', ...error } },
  };
}

/** The JSON body a request sent. */
export function bodyOf(request: Request | undefined): unknown {
  return typeof request?.data === 'string' ? JSON.parse(request.data) : request?.data;
}
