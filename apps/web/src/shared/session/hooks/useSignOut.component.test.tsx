import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, restoreTransport } from '../../../test/fakeTransport';
import { useSignOut } from './useSignOut';
import { establishSession, getSession } from '../store';

afterEach(() => {
  restoreTransport();
});

describe('useSignOut', () => {
  it('is pending while the server answers, then ends the session', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const answer = deferred<FakeAnswer>();
    fakeTransport(() => answer.promise);
    const { result } = renderHook(() => useSignOut());

    let signingOut: Promise<void> | undefined;
    act(() => {
      signingOut = result.current.signOut();
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      answer.resolve({ status: 204 });
      await signingOut;
    });

    expect(result.current).toMatchObject({ isPending: false, error: null });
    expect(getSession().status).toBe('anonymous');
  });

  it('exposes the failure and keeps the session when the server cannot be reached', async () => {
    establishSession(aSession(), { source: 'signIn' });
    fakeTransport(() => ({ failure: 'ERR_NETWORK' }));
    const { result } = renderHook(() => useSignOut());

    await act(() => result.current.signOut());

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ type: 'network' });
    });
    expect(result.current.isPending).toBe(false);
    expect(getSession().status).toBe('authenticated');
  });
});
