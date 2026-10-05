import { establishSession, getSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession, deferred } from '../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { startPreferences } from '../../../test/startPreferences';
import { useForcedPasswordChangeForm } from './useForcedPasswordChangeForm';

type Form = ReturnType<typeof useForcedPasswordChangeForm>;

/** The hook, answered by `answer`, as the change page uses it; returns the requests it sent too. */
function renderForm(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport(answer);
  const rendered = renderHook(() => useForcedPasswordChangeForm(), { wrapper: queryWrapper() });
  return { ...rendered, requests };
}

/** Types a new password through the field's bindings and sends the form. */
async function send(form: () => Form, password = 'mine2026x') {
  await act(async () => {
    await form()
      .field('password')
      .onChange({ target: { name: 'password', value: password } });
  });
  act(() => {
    form().submit();
  });
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ mustChangePassword: true }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
});

describe('useForcedPasswordChangeForm', () => {
  it('sends the new password alone, and clears the pending change once it succeeds', async () => {
    const { result, requests } = renderForm(() => ok({ accessToken: 'token-renewed' }));

    await send(() => result.current);

    await waitFor(() => {
      expect(getSession()).toMatchObject({ user: { mustChangePassword: false } });
    });
    expect(requests).toHaveLength(1);
    expect(JSON.parse(String(requests[0]?.data))).toEqual({ password: 'mine2026x' });
    expect(result.current.failure).toBeNull();
  });

  it('is pending, with the field disabled, while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderForm(() => answer.promise);

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.field('password').disabled).toBe(true);
    answer.resolve(ok({ accessToken: 'token-renewed' }));
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('ticks the rules as the password is typed, and words a failed one on the field', async () => {
    const { result, requests } = renderForm(() => ok({ accessToken: 'token-renewed' }));

    await send(() => result.current, 'mineonly');

    await waitFor(() => {
      expect(result.current.passwordRules.rules.map(({ state }) => state)).toEqual([
        'met',
        'met',
        'failed',
      ]);
    });
    expect(result.current.errors.password).toBe('The password doesn’t meet the rules below');
    expect(requests).toHaveLength(0);
  });

  it('words a refusal under the change’s own title', async () => {
    const { result } = renderForm(() => refused(503, { type: 'service_unavailable' }));

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'Couldn’t save the password',
      });
    });
    expect(getSession()).toMatchObject({ user: { mustChangePassword: true } });
  });
});
