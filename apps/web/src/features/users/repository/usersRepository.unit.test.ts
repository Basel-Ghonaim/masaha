import { apiClient, setupApiClient } from '@shared/api';
import { AppError } from '@shared/errors';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeAdapter, type FakeAnswer } from '../../../test/fakeAdapter';
import { createUsersRepository } from './usersRepository';

/** The app's one client, wired as bootstrap wires it, answering every request with `answer`. */
function serve(answer: FakeAnswer) {
  const server = fakeAdapter(() => answer);
  apiClient.defaults.adapter = server.adapter;
  return server.requests;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  setupApiClient({ getAccessToken: () => 'token-1' });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('the users repository', () => {
  it('POSTs the new password to /me/password and resolves to the unwrapped access token', async () => {
    const requests = serve({
      status: 200,
      data: { success: true, data: { accessToken: 'token-2' } },
    });

    await expect(
      createUsersRepository().changePassword({ password: 'mine2026x' }),
    ).resolves.toEqual({ accessToken: 'token-2' });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'post', baseURL: '/api/v1', url: '/me/password' });
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ password: 'mine2026x' });
  });

  it('rejects a refusal as an AppError, with its type and code', async () => {
    serve({
      status: 403,
      data: {
        success: false,
        error: {
          type: 'forbidden',
          code: 'ACCOUNT_SUSPENDED',
          message: 'Fake refusal',
          requestId: 'req-1',
        },
      },
    });

    const failure: unknown = await createUsersRepository()
      .changePassword({ password: 'mine2026x' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ type: 'forbidden', status: 403, code: 'ACCOUNT_SUSPENDED' });
  });
});
