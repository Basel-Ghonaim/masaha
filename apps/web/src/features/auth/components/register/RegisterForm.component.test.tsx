import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { RegisterForm, type RegisterFormProps } from './RegisterForm';

/** The form, with its own QueryClient, answered by `answer`; returns the requests it sent. */
function renderRegister(
  answer: () => FakeAnswer | Promise<FakeAnswer>,
  props: RegisterFormProps = {},
) {
  const requests = fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RegisterForm {...props} />
    </QueryClientProvider>,
  );
  return requests;
}

async function fillAndSubmit({
  name = 'Sara Ahmad',
  email = 'sara@example.com',
  password = 'gaza2026',
} = {}) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  return user;
}

/** A text with the Unicode isolates around its inserted values removed, as a reader sees it. */
function seen(text: string | null) {
  return text?.replace(/[\u2066-\u2069]/g, '');
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('RegisterForm', () => {
  it('shows what the password typed still lacks', async () => {
    renderRegister(() => ok(aSession(), 201));

    await userEvent.type(screen.getByLabelText('Password'), 'gaza');

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Still needs 4 more characters and a number',
    );
  });

  it('describes the password field by its condition', () => {
    renderRegister(() => ok(aSession(), 201));

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters, with a letter and a number',
    );
  });

  it('marks the fields that fail before sending, with the rules not met, and focuses the first', async () => {
    renderRegister(() => ok(aSession(), 201));

    await fillAndSubmit({ name: '', email: 'sara@', password: 'abc' });

    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Still needs 5 more characters and a number')).toHaveClass(
      'text-destructive',
    );
    expect(name).toHaveFocus();
  });

  it('shows the way to sign in the page passes once the email has an account', async () => {
    renderRegister(
      () =>
        refused(409, { type: 'conflict', code: 'EMAIL_TAKEN', errors: { email: ['not_unique'] } }),
      { signInLink: <a href="/login">Sign in with this email</a> },
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await fillAndSubmit();

    expect(await screen.findByRole('link', { name: 'Sign in with this email' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows the wait for too many attempts as a status, with the submit disabled', async () => {
    renderRegister(() => refused(429, { type: 'rate_limit' }, { 'retry-after': '900' }));

    await fillAndSubmit();

    const status = await screen.findByRole('status');
    expect(seen(status.textContent)).toBe('Too many attempts. Try again in 15:00.');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('shows no connection as an alert with the offer to try again', async () => {
    renderRegister(() => ({ failure: 'ERR_NETWORK' }));

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t connect');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it("shows any other refusal under the form's title", async () => {
    renderRegister(() => refused(503, { type: 'service_unavailable' }));

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t create the account');
    expect(alert).toHaveTextContent('The service is temporarily unavailable.');
  });

  it('disables the fields and marks the submit busy while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    renderRegister(() => answer.promise);

    await fillAndSubmit();

    const submit = screen.getByRole('button', { name: 'Create account' });
    await waitFor(() => {
      expect(submit).toHaveAttribute('aria-busy', 'true');
    });
    for (const label of ['Name', 'Email', 'Password']) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    answer.resolve(ok(aSession(), 201));
    await waitFor(() => {
      expect(submit).not.toHaveAttribute('aria-busy');
    });
  });

  it('opens with an email typed elsewhere, and reports it as it changes', async () => {
    const onEmailChange = vi.fn();
    renderRegister(() => ok(aSession(), 201), { defaultEmail: 'sara@example.com', onEmailChange });

    const email = screen.getByLabelText('Email');
    expect(email).toHaveValue('sara@example.com');
    await userEvent.clear(email);
    await userEvent.type(email, 'mona@example.com');

    expect(onEmailChange).toHaveBeenNthCalledWith(1, 'sara@example.com');
    expect(onEmailChange).toHaveBeenLastCalledWith('mona@example.com');
  });
});
