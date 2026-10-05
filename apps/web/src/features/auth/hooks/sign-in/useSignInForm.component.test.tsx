import { getSession } from '@shared/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useSignInForm } from './useSignInForm';

type Form = ReturnType<typeof useSignInForm>;

/** The hook, answered by `answer`, as the sign-in page uses it. */
function renderSignInForm(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(answer);
  return renderHook(() => useSignInForm(), { wrapper: queryWrapper() });
}

/** Types into a field through its bindings, as its input would. */
async function type(form: () => Form, name: 'email' | 'password', value: string) {
  await act(async () => {
    await form().field(name).onChange({ target: { name, value } });
  });
}

/** Fills the form with a valid sign-in and sends it. */
async function send(form: () => Form) {
  await type(form, 'email', 'sara@example.com');
  await type(form, 'password', 'gaza2026');
  act(() => {
    form().submit();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useSignInForm', () => {
  it('holds the session once the sign-in succeeds, with no failure', async () => {
    const { result } = renderSignInForm(() => ok(aSession({}, 'token-form')));

    await send(() => result.current);

    await waitFor(() => {
      expect(getSession()).toMatchObject({ status: 'authenticated', accessToken: 'token-form' });
    });
    expect(result.current.failure).toBeNull();
  });

  it('is pending, with the fields disabled, while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSignInForm(() => answer.promise);

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.field('email').disabled).toBe(true);
    answer.resolve(ok(aSession()));
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("names the client's failures with the sign-in's own lines", async () => {
    const { result } = renderSignInForm(() => ok(aSession()));

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.errors).toEqual({
        email: 'Check the email address, for example \u2066name@example.com\u2069',
        password: 'Enter your password',
      });
    });
  });

  it("words INVALID_CREDENTIALS as the failure under the sign-in's title", async () => {
    const { result } = renderSignInForm(() =>
      refused(401, { type: 'unauthorized', code: 'INVALID_CREDENTIALS' }),
    );

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.failure).toEqual({
        kind: 'refused',
        title: 'Couldn’t sign in',
        message: 'The email or password is incorrect.',
      });
    });
  });

  it('blocks the submit while too many attempts are counted down', async () => {
    const { result } = renderSignInForm(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '90' }),
    );

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.failure?.kind).toBe('rateLimit');
    });
    expect(result.current.blocked).toBe(true);
  });

  it("puts the server's field errors on their fields as text, with no failure", async () => {
    const { result } = renderSignInForm(() =>
      refused(422, { type: 'validation', errors: { password: ['too_long'] } }),
    );

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.errors).toEqual({ password: 'This is too long.' });
    });
    expect(result.current.failure).toBeNull();
  });
});
