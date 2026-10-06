import { Toaster, toast } from '@shared/design-system';
import { setLanguage } from '@shared/preferences';
import { getSession, onSessionEstablished } from '@shared/session';
import { useQueryClient } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useGoogleSignIn } from './useGoogleSignIn';

const REQUEST = { idToken: 'google-id-token', language: 'en' as const };

/** Google's answer: the session, and whether the sign-in has just linked an existing account. */
function googleSession(linked: boolean, language: 'ar' | 'en' = 'en', token = 'token-google') {
  return { ...aSession({ language }, token), linked };
}

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

describe('useGoogleSignIn', () => {
  it("holds Google's session as a sign-in", async () => {
    fakeTransport(() => ok(googleSession(false)));
    const sources = recordSessions();
    const { result } = renderHook(() => useGoogleSignIn(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(sources).toEqual(['signIn']);
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-google' });
  });

  it('still holds the session when the page unmounts before the answer, and keeps no Google token once it is answered', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const sources = recordSessions();
    const { result, unmount } = renderHook(
      () => ({ signIn: useGoogleSignIn(), mutations: useQueryClient().getMutationCache() }),
      { wrapper: queryWrapper() },
    );
    const { mutations } = result.current;

    act(() => {
      result.current.signIn.mutate(REQUEST);
    });
    unmount();
    answer.resolve(ok(googleSession(false, 'en', 'token-late')));

    await waitFor(() => {
      expect(sources).toEqual(['signIn']);
    });
    expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-late' });
    await waitFor(() => {
      expect(mutations.getAll()).toEqual([]);
    });
  });

  it('holds no session when Google sign-in is refused', async () => {
    fakeTransport(() => refused(409, { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' }));
    const established = vi.fn();
    onTestFinished(onSessionEstablished(established));
    const { result } = renderHook(() => useGoogleSignIn(), { wrapper: queryWrapper() });

    await act(async () => {
      await result.current.mutateAsync(REQUEST).catch(() => undefined);
    });

    expect(established).not.toHaveBeenCalled();
  });

  it('says the account was linked, and its password removed, when Google has just linked it', async () => {
    fakeTransport(() => ok(googleSession(true)));
    render(<Toaster label="Notifications" />);
    const { result } = renderHook(() => useGoogleSignIn(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(await screen.findByText('We linked your Google account to your account')).toBeVisible();
    expect(screen.getByText(/password was removed/)).toBeVisible();
  });

  it('says nothing when the account was already signing in with Google', async () => {
    fakeTransport(() => ok(googleSession(false)));
    render(<Toaster label="Notifications" />);
    const { result } = renderHook(() => useGoogleSignIn(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(screen.queryByText('We linked your Google account to your account')).toBeNull();
  });

  it("says it in the account's language, which the sign-in makes the interface's", async () => {
    // The composition root's listener (app/session.ts): a sign-in sets the account's language.
    onTestFinished(
      onSessionEstablished((session, { source }) => {
        if (source === 'signIn') setLanguage(session.user.language);
      }),
    );
    fakeTransport(() => ok(googleSession(true, 'ar')));
    render(<Toaster label="Notifications" />);
    const { result } = renderHook(() => useGoogleSignIn(), { wrapper: queryWrapper() });

    await act(() => result.current.mutateAsync(REQUEST));

    expect(await screen.findByText('ربطنا حساب Google بحسابك')).toBeVisible();
  });
});
