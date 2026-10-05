import { getSession, onSessionEstablished } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useSignIn } from './useSignIn';

const REQUEST = { email: 'sara@example.com', password: 'gaza2026' };

/** Records how each session arrives while the test runs. */
function recordSessions() {
  const sources: string[] = [];
  onTestFinished(onSessionEstablished((_session, { source }) => sources.push(source)));
  return sources;
}

afterEach(() => {
  restoreTransport();
});

describe('useSignIn', () => {
  it('holds the session the server issued, as a sign-in', async () => {
    fakeTransport(() => ok(aSession({}, 'token-5')));
    const sources = recordSessions();
    const { result } = renderHook(() => useSignIn(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(sources).toEqual(['signIn']);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-5' });
  });

  it('is pending while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result } = renderHook(() => useSignIn(), { wrapper: queryWrapper() });

    act(() => {
      result.current.mutate(REQUEST);
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    answer.resolve(ok(aSession()));
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('holds no session when the sign-in is refused', async () => {
    fakeTransport(() => refused(401, { type: 'unauthorized', code: 'INVALID_CREDENTIALS' }));
    const established = vi.fn();
    onTestFinished(onSessionEstablished(established));
    const { result } = renderHook(() => useSignIn(), { wrapper: queryWrapper() });

    await act(async () => {
      await result.current.mutateAsync(REQUEST).catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
    expect(established).not.toHaveBeenCalled();
  });

  it('still holds the session when the page unmounts before the answer', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const sources = recordSessions();
    const { result, unmount } = renderHook(() => useSignIn(), { wrapper: queryWrapper() });

    act(() => {
      result.current.mutate(REQUEST);
    });
    unmount();
    answer.resolve(ok(aSession({}, 'token-late')));

    await waitFor(() => {
      expect(sources).toEqual(['signIn']);
    });
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-late' });
  });
});
