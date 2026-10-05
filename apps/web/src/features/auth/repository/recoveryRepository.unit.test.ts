import { AppError } from '@shared/errors';
import { afterEach, describe, expect, it } from 'vitest';
import { MASKED_EMAIL, sentPosition } from '../../../test/fakeRecovery';
import { bodyOf, fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { createRecoveryRepository } from './recoveryRepository';

const repository = createRecoveryRepository();

afterEach(() => {
  restoreTransport();
});

describe('recoveryRepository', () => {
  it('asks for a link with a POST of the email to /auth/password/forgot, resolving to the position', async () => {
    const requests = fakeTransport(() => ok(sentPosition(), 202));

    const position = await repository.requestLink({ email: 'sara@example.com' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/password/forgot' });
    expect(bodyOf(requests[0])).toEqual({ email: 'sara@example.com' });
    expect(position).toEqual(sentPosition());
  });

  it('asks for another link with a POST to /auth/password/resend with no body, resolving to the position', async () => {
    const requests = fakeTransport(() => ok(sentPosition({ canResend: false }), 202));

    const position = await repository.resendLink();

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/password/resend' });
    expect(requests[0]?.data).toBeUndefined();
    expect(position).toEqual(sentPosition({ canResend: false }));
  });

  it('reads the position with a GET of /auth/password/recovery', async () => {
    const requests = fakeTransport(() => ok({ step: 'request' }));

    const position = await repository.position();

    expect(requests[0]).toMatchObject({ method: 'get', url: '/auth/password/recovery' });
    expect(position).toEqual({ step: 'request' });
  });

  it('checks a link with a POST of its token to /auth/password/reset/check, resolving to the position', async () => {
    const position = { step: 'password', email: MASKED_EMAIL } as const;
    const requests = fakeTransport(() => ok(position));

    const checked = await repository.checkLink({ token: 'link-token' });

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/password/reset/check' });
    expect(bodyOf(requests[0])).toEqual({ token: 'link-token' });
    expect(checked).toEqual(position);
  });

  it('sets the password with a POST of the password alone to /auth/password/reset, resolving with nothing', async () => {
    const requests = fakeTransport(() => ({ status: 204 }));

    await expect(repository.resetPassword({ password: 'gaza2026x' })).resolves.toBeUndefined();

    expect(requests[0]).toMatchObject({ method: 'post', url: '/auth/password/reset' });
    expect(bodyOf(requests[0])).toEqual({ password: 'gaza2026x' });
  });

  it('rejects a refused resend with an AppError carrying its type and code', async () => {
    fakeTransport(() => refused(400, { type: 'bad_request', code: 'RESEND_LIMIT_REACHED' }));

    const failure = repository.resendLink();

    await expect(failure).rejects.toBeInstanceOf(AppError);
    await expect(failure).rejects.toMatchObject({
      type: 'bad_request',
      code: 'RESEND_LIMIT_REACHED',
    });
  });
});
