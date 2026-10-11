import { loginSchema, type LoginRequest } from '@masaha/shared/auth';
import { AppError } from '@shared/errors';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred } from '../../../test/fakeSession';
import { startPreferences } from '../../../test/startPreferences';
import { useServerForm, type ServerFormOptions } from './useServerForm';

type Values = { email: string; password: string };

/** A sign-in form whose server call is `submit`, filled with `values`, with `options` added. */
function renderForm(
  submit: (request: LoginRequest) => Promise<unknown>,
  values: Values = { email: '', password: '' },
  options: Partial<ServerFormOptions<Values, LoginRequest>> = {},
) {
  return renderHook(() =>
    useServerForm<Values, LoginRequest>({
      schema: loginSchema,
      defaultValues: values,
      fields: ['email', 'password'],
      submit,
      failureTitle: 'Couldn’t sign in',
      fieldLines: { password: { too_short: 'Enter your password' } },
      ...options,
    }),
  );
}

function refusal(fields: Partial<ConstructorParameters<typeof AppError>[0]>) {
  return new AppError({ type: 'validation', status: 422, message: 'Fake', ...fields });
}

const FILLED: Values = { email: ' Sara@Example.com ', password: 'gaza2026' };

/** The hook bound to real inputs, in display order, so the focus can be seen. */
function Bound({ submit }: { submit: (request: LoginRequest) => Promise<unknown> }) {
  const form = useServerForm<Values, LoginRequest>({
    schema: loginSchema,
    defaultValues: FILLED,
    fields: ['email', 'password'],
    submit,
    failureTitle: 'Couldn’t sign in',
  });
  return (
    <form onSubmit={form.submit}>
      <input aria-label="Email" {...form.field('email')} />
      <input aria-label="Password" {...form.field('password')} />
      <button type="submit">Send</button>
    </form>
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useServerForm', () => {
  it("names the schema's failures with the field-error codes' lines, the form's own first", async () => {
    const submit = vi.fn(() => Promise.resolve());
    const { result } = renderForm(submit);

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.errors).toEqual({
        email: 'This isn’t in a valid format.',
        password: 'Enter your password',
      });
    });
    expect(result.current.codes).toEqual({ email: 'invalid_format', password: 'too_short' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends the parsed values to the server call', async () => {
    const submit = vi.fn(() => Promise.resolve());
    const { result } = renderForm(submit, FILLED);

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({ email: 'sara@example.com', password: 'gaza2026' });
    });
    expect(result.current.failure).toBeNull();
  });

  it('sends what the form prepares from its values, parsed', async () => {
    const submit = vi.fn(() => Promise.resolve());
    const { result } = renderForm(
      submit,
      { email: 'Sara', password: 'gaza2026' },
      { prepare: (values) => ({ ...values, email: `${values.email}@example.com` }) },
    );

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith({ email: 'sara@example.com', password: 'gaza2026' });
    });
  });

  it("words a refusal that lands on no field with the form's own line for it", async () => {
    const { result } = renderForm(
      () => Promise.reject(refusal({ type: 'conflict', status: 409, requestId: 'req-1' })),
      FILLED,
      { failureLines: { conflict: 'Someone else did the same just now. Send it again.' } },
    );

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.failure).toEqual({
        kind: 'refused',
        title: 'Couldn’t sign in',
        message: 'Someone else did the same just now. Send it again.',
        reference: `Reference: ${String.fromCodePoint(0x2066)}req-1${String.fromCodePoint(0x2069)}`,
      });
    });
  });

  it('is pending, with the fields disabled, while the server answers', async () => {
    const answer = deferred<undefined>();
    const { result } = renderForm(() => answer.promise, FILLED);

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
    expect(result.current.field('email').disabled).toBe(true);

    await act(async () => {
      answer.resolve(undefined);
      await answer.promise;
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.field('email').disabled).toBe(false);
  });

  it("puts the server's field errors on their fields as text, with no failure", async () => {
    const { result } = renderForm(
      () => Promise.reject(refusal({ errors: { email: ['not_unique'] } })),
      FILLED,
    );

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.errors).toEqual({ email: 'This value is already in use.' });
    });
    expect(result.current.codes).toEqual({ email: 'not_unique' });
    expect(result.current.failure).toBeNull();
  });

  it('turns a refusal with no field errors into the failure view, under the form title', async () => {
    const { result } = renderForm(
      () =>
        Promise.reject(refusal({ type: 'unauthorized', status: 401, code: 'INVALID_CREDENTIALS' })),
      FILLED,
    );

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.failure).toEqual({
        kind: 'refused',
        title: 'Couldn’t sign in',
        message: 'The email or password is incorrect.',
      });
    });
    expect(result.current.errors).toEqual({});
  });

  it('clears the last failure as the form is sent again', async () => {
    const answers = [
      Promise.reject(refusal({ type: 'server', status: 500 })),
      new Promise<never>(() => undefined),
    ];
    const { result } = renderForm(() => answers.shift() ?? Promise.resolve(), FILLED);

    act(() => {
      result.current.submit();
    });
    await waitFor(() => {
      expect(result.current.failure).not.toBeNull();
    });

    act(() => {
      result.current.submit();
    });

    expect(result.current.failure).toBeNull();
  });

  it("focuses the first field the server names in the form's display order, not the answer's", async () => {
    const answer = refusal({ errors: { password: ['too_long'], email: ['too_long'] } });
    render(<Bound submit={() => Promise.reject(answer)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveFocus();
    });
  });
});
