import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { CLIENT_ID, fakeGoogle, clearGoogle } from '../../../../test/fakeGoogle';
import { aSession, deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useContinueWithGoogle } from './useContinueWithGoogle';

const TITLE = 'Couldn’t continue with Google';

/**
 * The hook, answered by `answer`, with Google on the page and its button drawn: returns the requests
 * it sent, and Google's window, in which the person chooses their account.
 */
async function renderGoogleSignIn(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const google = fakeGoogle();
  google.install();
  const requests = fakeTransport(answer);
  const rendered = renderHook(() => useContinueWithGoogle(), { wrapper: queryWrapper() });
  act(() => {
    rendered.result.current.buttonRef(document.createElement('div'));
  });
  await waitFor(() => {
    expect(google.buttons).toHaveLength(1);
  });
  const choose = () => {
    act(() => {
      google.choose('google-id-token');
    });
  };
  return { ...rendered, requests, choose };
}

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearGoogle();
});

describe('useContinueWithGoogle', () => {
  it.each(['en', 'ar'] as const)(
    "sends Google's ID token with the interface language, %s",
    async (language) => {
      startPreferences(language);
      const { requests, choose } = await renderGoogleSignIn(() =>
        ok({ ...aSession(), linked: false }),
      );

      choose();

      await waitFor(() => {
        expect(requests).toHaveLength(1);
      });
      expect(bodyOf(requests[0])).toEqual({ idToken: 'google-id-token', language });
    },
  );

  it.each([
    [
      'an email whose account Google may not open',
      refused(409, { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' }),
      'An account with this email already exists. Sign in with its password, or reset it under “Forgot password”.',
    ],
    [
      'a token Google did not confirm',
      refused(401, { type: 'unauthorized', code: 'GOOGLE_TOKEN_INVALID' }),
      'Google couldn’t confirm your account. Try again, or use your email and password.',
    ],
    [
      'a suspended account',
      refused(403, { type: 'forbidden', code: 'ACCOUNT_SUSPENDED' }),
      'This account is suspended.',
    ],
    [
      'Google sign-in unavailable on the server',
      refused(503, { type: 'service_unavailable' }),
      'Google sign-in isn’t available right now. Use your email and password, or try again later.',
    ],
    [
      'no connection',
      { failure: 'ERR_NETWORK' } as const,
      'No connection. Check your internet and try again.',
    ],
  ])('shows its own line for %s', async (_case, answer, message) => {
    startPreferences('en');
    const { result, choose } = await renderGoogleSignIn(() => answer);

    choose();

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({ kind: 'refused', title: TITLE, message });
    });
    expect(result.current.busy).toBe(false);
  });

  it('counts down the wait after too many attempts, busy until it ends', async () => {
    startPreferences('en');
    const { result, choose } = await renderGoogleSignIn(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '90' }),
    );

    choose();

    await waitFor(() => {
      expect(result.current.failure?.kind).toBe('rateLimit');
    });
    // The wait is a clock isolated left to right; what the person reads has no isolates.
    expect(result.current.failure?.message.replace(/[\u2066-\u2069]/g, '')).toBe(
      'Too many attempts. Try again in 1:30.',
    );
    expect(result.current.busy).toBe(true);
  });

  it('is busy while the sign-in is under way', async () => {
    startPreferences('en');
    const answer = deferred<FakeAnswer>();
    const { result, choose } = await renderGoogleSignIn(() => answer.promise);

    choose();

    await waitFor(() => {
      expect(result.current.busy).toBe(true);
    });
    answer.resolve(ok({ ...aSession(), linked: false }));
    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });
  });

  it('shows no failure, and sends nothing, until Google hands back a credential, as when its window is closed', async () => {
    startPreferences('en');
    const { result, requests } = await renderGoogleSignIn(() =>
      ok({ ...aSession(), linked: false }),
    );

    expect(result.current.failure).toBeNull();
    expect(result.current.busy).toBe(false);
    expect(requests).toHaveLength(0);
  });
});
