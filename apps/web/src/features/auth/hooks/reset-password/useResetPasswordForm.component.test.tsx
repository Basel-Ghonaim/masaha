import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useResetPasswordForm } from './useResetPasswordForm';

type Form = ReturnType<typeof useResetPasswordForm>;

/** The hook, its reset answered by `answer`; `saved` records the password set. */
function renderResetForm(answer: () => FakeAnswer) {
  fakeTransport(answer);
  const saved = vi.fn();
  const rendered = renderHook(() => useResetPasswordForm(saved), { wrapper: queryWrapper() });
  return { ...rendered, saved };
}

/** Types the password through its bindings and sends the form. */
async function send(form: () => Form, password: string) {
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
});

afterEach(() => {
  restoreTransport();
});

describe('useResetPasswordForm', () => {
  it('tells the page once the server set the password', async () => {
    const { result, saved } = renderResetForm(() => ({ status: 204 }));

    await send(() => result.current, 'gaza2026x');

    await waitFor(() => {
      expect(saved).toHaveBeenCalledTimes(1);
    });
  });

  it('titles a refusal as the password not saved, and tells the page nothing', async () => {
    const { result, saved } = renderResetForm(() => refused(500, { type: 'server' }));

    await send(() => result.current, 'gaza2026x');

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'Couldn’t save the password',
      });
    });
    expect(saved).not.toHaveBeenCalled();
  });

  it('words a password that breaks the policy with the form’s own line, against its rules', async () => {
    const { result } = renderResetForm(() => ({ status: 204 }));

    await send(() => result.current, 'short');

    await waitFor(() => {
      expect(result.current.errors.password).toBe('The password doesn’t meet the rules below');
    });
  });
});
