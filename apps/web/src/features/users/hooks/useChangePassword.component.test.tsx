import { establishSession, getSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { useChangePassword } from './useChangePassword';

const REQUEST = { password: 'mine2026x' };

beforeEach(() => {
  establishSession(aSession({ mustChangePassword: true }, 'token-temporary'), {
    source: 'signIn',
  });
});

afterEach(() => {
  restoreTransport();
});

describe('useChangePassword', () => {
  it('goes on with the renewed token and no change pending once the change succeeds', async () => {
    fakeTransport(() => ok({ accessToken: 'token-renewed' }));
    const { result } = renderHook(() => useChangePassword(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(getSession()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token-renewed',
      user: { mustChangePassword: false },
    });
  });

  it('still renews the session when the page unmounts before the answer', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result, unmount } = renderHook(() => useChangePassword(), { wrapper: queryWrapper() });

    act(() => {
      result.current.mutate(REQUEST);
    });
    unmount();
    answer.resolve(ok({ accessToken: 'token-late' }));

    await waitFor(() => {
      expect(getSession()).toMatchObject({
        accessToken: 'token-late',
        user: { mustChangePassword: false },
      });
    });
  });

  it('leaves another user who signed in before the answer with their own session', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result } = renderHook(() => useChangePassword(), { wrapper: queryWrapper() });
    act(() => {
      result.current.mutate(REQUEST);
    });
    const other = aSession({ id: 2, mustChangePassword: true }, 'token-other');
    establishSession(other, { source: 'signIn' });

    answer.resolve(ok({ accessToken: 'token-late' }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(getSession()).toEqual({
      status: 'authenticated',
      user: other.user,
      accessToken: 'token-other',
    });
  });

  it('keeps the change pending when the server refuses it', async () => {
    fakeTransport(() => refused(403, { type: 'forbidden', code: 'ACCOUNT_SUSPENDED' }));
    const { result } = renderHook(() => useChangePassword(), { wrapper: queryWrapper() });

    await act(async () => {
      await result.current.mutateAsync(REQUEST).catch(() => undefined);
    });

    expect(getSession()).toMatchObject({
      accessToken: 'token-temporary',
      user: { mustChangePassword: true },
    });
  });
});
