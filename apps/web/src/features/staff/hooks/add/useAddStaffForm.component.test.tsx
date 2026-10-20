import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { useStaffQuery } from '../list/useStaffQuery';
import { useAddStaffForm, type AddedStaffView } from './useAddStaffForm';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];
type Form = ReturnType<typeof useAddStaffForm>;

/** The add form of space 7, beside the list it adds to; the server answers every add with `add`. */
async function renderForm(add: () => FakeAnswer) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : add()));
  const client = createQueryClient();
  const onAdded = vi.fn<(added: AddedStaffView) => void>();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    () => ({ list: useStaffQuery(7), form: useAddStaffForm({ spaceId: 7, onAdded }) }),
    { wrapper },
  );
  await waitFor(() => {
    expect(rendered.result.current.list.isSuccess).toBe(true);
  });
  return { ...rendered, requests, client, onAdded };
}

/** Types `value` into a field, as the user would. */
async function type(binding: Form['fields']['name'], value: string) {
  await act(async () => {
    await binding.onChange({ target: { name: binding.name, value } });
  });
}

/** Fills Rahaf's name and email, then sends the form. */
async function addRahaf(result: { current: { form: Form } }) {
  act(() => {
    result.current.form.setOpen(true);
  });
  await type(result.current.form.fields.name, 'Rahaf');
  await type(result.current.form.fields.email, 'rahaf@example.com');
  await act(async () => {
    result.current.form.submit.run();
    await Promise.resolve();
  });
}

const gets = (requests: Request[]) => requests.filter(({ method }) => method === 'get');

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('useAddStaffForm', () => {
  it('says a new account is made and no existing one linked, before the submit', async () => {
    const { result } = await renderForm(() => ok({ userId: 15, temporaryPassword: 'x' }, 201));

    expect(result.current.form.notice).toBe(
      'A new account is created for this email, with a temporary password shown to you once — have a way to hand it over ready. An existing account is never linked.',
    );
    expect(result.current.form.submit.label).toBe('Create the reception account');
  });

  it('lands an email that has an account on the email, in the owner’s words', async () => {
    const { result, onAdded } = await renderForm(() =>
      refused(409, {
        type: 'conflict',
        code: 'EMAIL_HAS_ACCOUNT',
        errors: { email: ['not_unique'] },
      }),
    );

    await addRahaf(result);

    await waitFor(() => {
      expect(result.current.form.errors.email).toBe(
        'This email already has a Masaha account, and an existing account is never linked. Use another email; if they are on your staff list, act from their row: give their access back, or issue them a new temporary password.',
      );
    });
    expect(result.current.form.open).toBe(true);
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('hands the password to the page once the list has arrived, keeping none in the cache', async () => {
    const { result, requests, client, onAdded } = await renderForm(() =>
      ok({ userId: 15, temporaryPassword: 'Tmp-4821-xk' }, 201),
    );
    let listedWhenAdded = 0;
    onAdded.mockImplementation(() => {
      listedWhenAdded = gets(requests).length;
    });

    await addRahaf(result);

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledExactlyOnceWith({
        person: { userId: 15, name: 'Rahaf', email: 'rahaf@example.com' },
        password: 'Tmp-4821-xk',
      });
    });
    expect(listedWhenAdded).toBe(2);
    expect(bodyOf(requests.find(({ method }) => method === 'post'))).toEqual({
      name: 'Rahaf',
      email: 'rahaf@example.com',
    });
    expect(result.current.form.open).toBe(false);
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map(({ state }) => state),
      ),
    ).not.toContain('Tmp-4821-xk');
  });

  it('reads the list again when the add gets no answer, so an account the server made shows', async () => {
    const { result, requests, onAdded } = await renderForm(() => ({ failure: 'ERR_NETWORK' }));

    await addRahaf(result);

    await waitFor(() => {
      expect(gets(requests)).toHaveLength(2);
    });
    expect(result.current.form.failure).not.toBeNull();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('counts a refusal for too many attempts down, holding the submit', async () => {
    const { result } = await renderForm(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    await addRahaf(result);

    await waitFor(() => {
      expect(result.current.form.failure).toMatchObject({ kind: 'rateLimit' });
    });
    expect(result.current.form.submit.blocked).toBe(true);
  });
});
