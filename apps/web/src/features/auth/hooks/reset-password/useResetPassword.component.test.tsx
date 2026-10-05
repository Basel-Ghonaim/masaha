import { establishSession, getSession, restoreSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { MASKED_EMAIL } from '../../../../test/fakeRecovery';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { setSessionHint } from '../../../../test/sessionHint';
import { useRecoveryPositionQuery } from '../useRecoveryPositionQuery';
import { useResetPassword } from './useResetPassword';

/** A request, as the fake server receives it. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PASSWORD = { password: 'gaza2026x' };

/** The reset beside the recovery's read; `answer` answers what is not the read. */
function renderReset(answer: (config: Request) => FakeAnswer) {
  let reads = 0;
  const requests = fakeTransport((config) => {
    if (config.method !== 'get') return answer(config);
    reads += 1;
    return ok(reads === 1 ? { step: 'password', email: MASKED_EMAIL } : { step: 'request' });
  });
  const rendered = renderHook(
    () => ({ reset: useResetPassword(), position: useRecoveryPositionQuery() }),
    { wrapper: queryWrapper() },
  );
  return { ...rendered, urls: () => requests.map((request) => request.url) };
}

beforeEach(async () => {
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  restoreTransport();
  setSessionHint(false);
});

describe('useResetPassword', () => {
  it('holds the recovery as ended once the password is set, without reading it again', async () => {
    const { result, urls } = renderReset(() => ({ status: 204 }));
    await waitFor(() => {
      expect(result.current.position.data?.step).toBe('password');
    });

    await act(() => result.current.reset.mutateAsync(PASSWORD));

    await waitFor(() => {
      expect(result.current.position.data).toEqual({ step: 'request' });
    });
    expect(urls()).toEqual(['/auth/password/recovery', '/auth/password/reset']);
  });

  it('asks a guest’s browser nothing more once the password is set', async () => {
    const { result, urls } = renderReset(() => ({ status: 204 }));

    await act(() => result.current.reset.mutateAsync(PASSWORD));

    expect(urls()).not.toContain('/auth/refresh');
  });

  it('ends the session this browser holds when the reset ended it', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const { result } = renderReset((config) =>
      config.url === '/auth/refresh' ? refused(401, { type: 'unauthorized' }) : { status: 204 },
    );

    await act(() => result.current.reset.mutateAsync(PASSWORD));

    await waitFor(() => {
      expect(getSession().status).toBe('anonymous');
    });
  });

  it('keeps the session this browser holds when it is another account’s', async () => {
    establishSession(aSession({}, 'token-1'), { source: 'signIn' });
    const { result, urls } = renderReset((config) =>
      config.url === '/auth/refresh' ? ok(aSession({}, 'token-2')) : { status: 204 },
    );

    await act(() => result.current.reset.mutateAsync(PASSWORD));

    await waitFor(() => {
      expect(urls()).toContain('/auth/refresh');
    });
    await waitFor(() => {
      expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-2' });
    });
  });

  it('reads the position again when the recovery moved on', async () => {
    const { result } = renderReset(() =>
      refused(400, { type: 'bad_request', code: 'RECOVERY_INVALID' }),
    );
    await waitFor(() => {
      expect(result.current.position.data?.step).toBe('password');
    });

    await act(async () => {
      await result.current.reset.mutateAsync(PASSWORD).catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.position.data).toEqual({ step: 'request' });
    });
  });
});
