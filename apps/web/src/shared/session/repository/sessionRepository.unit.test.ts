import { AppError } from '@shared/errors';
import { afterEach, describe, expect, it } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { createSessionRepository } from './sessionRepository';

const repository = createSessionRepository();

afterEach(() => {
  restoreTransport();
});

describe('sessionRepository', () => {
  it('refreshes with a bodiless POST to /auth/refresh, resolving to the renewed session', async () => {
    const requests = fakeTransport(() => ok(aSession({}, 'token-renewed')));

    const session = await repository.refresh();

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/refresh' });
    expect(requests[0]?.data).toBeUndefined();
    expect(session).toEqual(aSession({}, 'token-renewed'));
  });

  it('signs out with a bodiless POST to /auth/logout, resolving with nothing on a 204', async () => {
    const requests = fakeTransport(() => ({ status: 204 }));

    await expect(repository.logout()).resolves.toBeUndefined();

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/logout' });
    expect(requests[0]?.data).toBeUndefined();
  });

  it('rejects a refused refresh with an AppError carrying its type and code', async () => {
    fakeTransport(() => refused(403, { type: 'forbidden', code: 'ACCOUNT_SUSPENDED' }));

    const failure = repository.refresh();

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'forbidden', code: 'ACCOUNT_SUSPENDED' });
  });

  it('rejects a sign-out that cannot reach the server with an AppError of type network', async () => {
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));

    const failure = repository.logout();

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({ type: 'network' });
  });
});
