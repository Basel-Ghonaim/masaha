import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { aSession, appError, deferred, fakeEndpoints, fakeHint } from '../../test/fakeSession';
import { useSignOut } from './hooks';
import { establishSession, getSession } from './store';

describe('useSignOut', () => {
  it('is pending while the server answers, then ends the session', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const answer = deferred<undefined>();
    const dependencies = {
      endpoints: fakeEndpoints({ logout: () => answer.promise }),
      hint: fakeHint(true),
    };
    const { result } = renderHook(() => useSignOut(dependencies));

    let signingOut: Promise<void> | undefined;
    act(() => {
      signingOut = result.current.signOut();
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      answer.resolve(undefined);
      await signingOut;
    });

    expect(result.current).toMatchObject({ isPending: false, error: null });
    expect(getSession().status).toBe('anonymous');
  });

  it('exposes the failure and keeps the session when the server cannot be reached', async () => {
    establishSession(aSession(), { source: 'signIn' });
    const dependencies = {
      endpoints: fakeEndpoints({ logout: () => Promise.reject(appError('network', 0)) }),
      hint: fakeHint(true),
    };
    const { result } = renderHook(() => useSignOut(dependencies));

    await act(() => result.current.signOut());

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ type: 'network' });
    });
    expect(result.current.isPending).toBe(false);
    expect(getSession().status).toBe('authenticated');
  });
});
