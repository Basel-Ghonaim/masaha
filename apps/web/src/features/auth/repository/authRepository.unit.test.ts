import { AppError } from '@shared/errors';
import { afterEach, describe, expect, it } from 'vitest';
import { aSession } from '../../../test/fakeSession';
import { bodyOf, fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { createAuthRepository } from './authRepository';

const repository = createAuthRepository();

afterEach(() => {
  restoreTransport();
});

describe('authRepository', () => {
  it('signs in with a POST of the email and password to /auth/login, resolving to the session', async () => {
    const requests = fakeTransport(() => ok(aSession({}, 'token-2')));

    const session = await repository.login({ email: 'sara@example.com', password: 'gaza2026' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/login' });
    expect(bodyOf(requests[0])).toEqual({ email: 'sara@example.com', password: 'gaza2026' });
    expect(session).toEqual(aSession({}, 'token-2'));
  });

  it('registers with a POST of the account to /auth/register, resolving to the session', async () => {
    const requests = fakeTransport(() => ok(aSession({ name: 'Sara' }), 201));
    const account = {
      name: 'Sara',
      email: 'sara@example.com',
      password: 'gaza2026',
      language: 'en' as const,
    };

    const session = await repository.register(account);

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/register' });
    expect(bodyOf(requests[0])).toEqual(account);
    expect(session).toEqual(aSession({ name: 'Sara' }));
  });

  it('rejects a refused sign-in with an AppError carrying its type and code', async () => {
    fakeTransport(() => refused(401, { type: 'unauthorized', code: 'INVALID_CREDENTIALS' }));

    const failure = repository.login({ email: 'sara@example.com', password: 'wrong' });

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({
      type: 'unauthorized',
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects a refused registration with an AppError carrying its field errors', async () => {
    fakeTransport(() =>
      refused(409, { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } }),
    );

    const failure = repository.register({ name: 'S', email: 'a@b.co', password: 'gaza2026' });

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({
      type: 'conflict',
      code: 'EMAIL_TAKEN',
      errors: { email: ['not_unique'] },
    });
  });

  it("signs in with a POST of Google's ID token and the language to /auth/google, resolving to the session and whether it linked", async () => {
    const answer = { ...aSession({}, 'token-google'), linked: true };
    const requests = fakeTransport(() => ok(answer));

    const session = await repository.google({ idToken: 'google-id-token', language: 'ar' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/google' });
    expect(bodyOf(requests[0])).toEqual({ idToken: 'google-id-token', language: 'ar' });
    expect(session).toEqual(answer);
  });

  it('rejects a refused Google sign-in with an AppError carrying its type and code', async () => {
    fakeTransport(() => refused(409, { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' }));

    const failure = repository.google({ idToken: 'google-id-token' });

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({
      type: 'conflict',
      code: 'GOOGLE_LINK_NOT_ALLOWED',
    });
  });
});
