import { establishSession, getSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { startPreferences } from '../../../test/startPreferences';
import { useAccount } from './useAccount';

const USER = aSession({ name: '  Sara Ahmad ', email: 'sara@example.com' }).user;

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession(USER), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAccount', () => {
  it('gives the names, the initial, the email and the labels, ready to render', () => {
    const { result } = renderHook(() => useAccount(USER));

    expect(result.current).toMatchObject({
      name: 'Sara Ahmad',
      firstName: 'Sara',
      initial: 'S',
      email: 'sara@example.com',
      menuLabel: 'Account menu: \u2068Sara Ahmad\u2069',
      sectionLabel: 'Account',
      signOutLabel: 'Sign out',
      isPending: false,
      failure: null,
    });
  });

  it("takes an Arabic name's first word and first letter", () => {
    const { result } = renderHook(() => useAccount({ ...USER, name: 'سارة أحمد' }));

    expect(result.current).toMatchObject({ firstName: 'سارة', initial: 'س' });
  });

  it('is pending while the server signs out, then ends the session', async () => {
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result } = renderHook(() => useAccount(USER));

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
    const { result } = renderHook(() => useAccount(USER));

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
