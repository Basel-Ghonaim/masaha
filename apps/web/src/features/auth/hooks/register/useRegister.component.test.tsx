import { Toaster, toast } from '@shared/design-system';
import { getSession, onSessionEstablished } from '@shared/session';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useRegister } from './useRegister';

const REQUEST = {
  name: 'Sara',
  email: 'sara@example.com',
  password: 'gaza2026',
  language: 'ar' as const,
};

/** Records how each session arrives while the test runs. */
function recordSessions() {
  const sources: string[] = [];
  onTestFinished(onSessionEstablished((_session, { source }) => sources.push(source)));
  return sources;
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('useRegister', () => {
  it('welcomes the new account by its name', async () => {
    fakeTransport(() => ok(aSession({ name: 'Sara', language: 'en' }), 201));
    render(<Toaster label="Notifications" />);
    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync({ ...REQUEST, language: 'en' }));

    expect(await screen.findByText(/^Welcome \S*Sara\S*, your account is ready$/)).toBeVisible();
  });

  it("holds the new account's session, as a sign-in", async () => {
    fakeTransport(() => ok(aSession({}, 'token-new'), 201));
    const sources = recordSessions();
    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(sources).toEqual(['signIn']);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-new' });
  });

  it('holds no session when the registration is refused', async () => {
    fakeTransport(() =>
      refused(409, { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } }),
    );
    const established = vi.fn();
    onTestFinished(onSessionEstablished(established));
    const { result } = renderHook(() => useRegister(), { wrapper: queryWrapper() });

    await act(async () => {
      await result.current.mutateAsync(REQUEST).catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ code: 'EMAIL_TAKEN' });
    });
    expect(established).not.toHaveBeenCalled();
  });

  it('still holds the session when the page unmounts before the answer', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const sources = recordSessions();
    const { result, unmount } = renderHook(() => useRegister(), { wrapper: queryWrapper() });

    act(() => {
      result.current.mutate(REQUEST);
    });
    unmount();
    answer.resolve(ok(aSession({}, 'token-late-new'), 201));

    await waitFor(() => {
      expect(sources).toEqual(['signIn']);
    });
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-late-new' });
  });
});
