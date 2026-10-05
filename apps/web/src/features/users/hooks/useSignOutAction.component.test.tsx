import { establishSession, getSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { useSignOutAction } from './useSignOutAction';

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSignOutAction', () => {
  it('gives the label, with nothing pending and no failure', () => {
    const { result } = renderHook(() => useSignOutAction());

    expect(result.current).toMatchObject({
      signOutLabel: 'Sign out',
      isPending: false,
      failure: null,
    });
  });

  it('is pending while the server signs out, then ends the session', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result } = renderHook(() => useSignOutAction());

    act(() => {
      result.current.signOut();
    });
    expect(result.current.isPending).toBe(true);

    answer.resolve({ status: 204 });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(getSession().status).toBe('anonymous');
  });

  it('words a failed sign-out, and keeps the session', async () => {
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));
    const { result } = renderHook(() => useSignOutAction());

    act(() => {
      result.current.signOut();
    });

    await waitFor(() => {
      expect(result.current.failure).toEqual({
        title: 'Couldn’t sign out',
        message: 'No connection. Check your internet and try again.',
      });
    });
    expect(getSession().status).toBe('authenticated');
  });
});
