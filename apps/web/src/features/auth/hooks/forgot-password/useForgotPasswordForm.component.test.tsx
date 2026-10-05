import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useForgotPasswordForm } from './useForgotPasswordForm';

type Form = ReturnType<typeof useForgotPasswordForm>;

/** The hook, its request answered by `answer`. */
function renderForgotForm(answer: () => FakeAnswer) {
  fakeTransport(answer);
  return renderHook(() => useForgotPasswordForm(), { wrapper: queryWrapper() });
}

/** Types the email through its bindings and sends the form. */
async function send(form: () => Form, email: string) {
  await act(async () => {
    await form()
      .field('email')
      .onChange({ target: { name: 'email', value: email } });
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

describe('useForgotPasswordForm', () => {
  it('words a malformed email with the form’s own line, and sends nothing', async () => {
    let sent = 0;
    const { result } = renderForgotForm(() => {
      sent += 1;
      return refused(500, { type: 'server' });
    });

    await send(() => result.current, 'sara@');

    await waitFor(() => {
      expect(result.current.errors.email?.replace(/[\u2066-\u2069]/g, '')).toBe(
        'Check the email address, for example name@example.com',
      );
    });
    expect(sent).toBe(0);
  });

  it('titles a refusal as the link not sent', async () => {
    const { result } = renderForgotForm(() => refused(500, { type: 'server' }));

    await send(() => result.current, 'sara@example.com');

    await waitFor(() => {
      expect(result.current.failure).toMatchObject({
        kind: 'refused',
        title: 'Couldn’t send the link',
      });
    });
  });
});
