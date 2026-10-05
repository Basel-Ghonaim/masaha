import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../test/fakeAdapter';
import { aSession } from '../../../test/fakeSession';
import { bodyOf, fakeTransport, ok, refused, restoreTransport } from '../../../test/fakeTransport';
import { queryWrapper } from '../../../test/queryWrapper';
import { startPreferences } from '../../../test/startPreferences';
import { useRegisterForm } from './useRegisterForm';

type Form = ReturnType<typeof useRegisterForm>;
type Name = 'name' | 'email' | 'password';

/** The hook, answered by `answer`, as the register page uses it; returns the requests it sent. */
function renderRegisterForm(answer: () => FakeAnswer) {
  const requests = fakeTransport(answer);
  const rendered = renderHook(() => useRegisterForm(), { wrapper: queryWrapper() });
  return { ...rendered, requests };
}

/** Types into a field through its bindings, as its input would. */
async function type(form: () => Form, name: Name, value: string) {
  await act(async () => {
    await form().field(name).onChange({ target: { name, value } });
  });
}

/** Fills the form and sends it. */
async function send(form: () => Form, password = 'gaza2026') {
  await type(form, 'name', 'Sara');
  await type(form, 'email', 'sara@example.com');
  await type(form, 'password', password);
  act(() => {
    form().submit();
  });
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useRegisterForm', () => {
  it.each(['en', 'ar'] as const)(
    'adds the interface language, %s, to the account it sends',
    async (language) => {
      startPreferences(language);
      const { result, requests } = renderRegisterForm(() => ok(aSession(), 201));

      await send(() => result.current);

      await waitFor(() => {
        expect(requests).toHaveLength(1);
      });
      expect(bodyOf(requests[0])).toMatchObject({ language });
    },
  );

  it('ticks the password rules for the password as typed', async () => {
    startPreferences('en');
    const { result } = renderRegisterForm(() => ok(aSession(), 201));

    await type(() => result.current, 'password', 'gaza');

    expect(result.current.passwordRules.rules.map(({ state }) => state)).toEqual([
      'pending',
      'met',
      'pending',
    ]);
  });

  it('shows the rules not met as failed once sent with the password failing them', async () => {
    startPreferences('en');
    const { result, requests } = renderRegisterForm(() => ok(aSession(), 201));

    await send(() => result.current, 'gazagaza');

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

  it("tells that the email already has an account on EMAIL_TAKEN, with the server's line on the field", async () => {
    startPreferences('en');
    const { result } = renderRegisterForm(() =>
      refused(409, { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } }),
    );
    expect(result.current.emailTaken).toBe(false);

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.emailTaken).toBe(true);
    });
    expect(result.current.errors.email).toBe('An account with this email already exists.');
    expect(result.current.failure).toBeNull();
  });

  it("words any other refusal under the register's title", async () => {
    startPreferences('en');
    const { result } = renderRegisterForm(() => refused(503, { type: 'service_unavailable' }));

    await send(() => result.current);

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'Couldn’t create the account',
      });
    });
  });
});
