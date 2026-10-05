import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { SignInForm, type SignInFormProps } from './SignInForm';

/** The form, with its own QueryClient, answered by `answer`. */
function renderSignIn(answer: () => FakeAnswer | Promise<FakeAnswer>, props: SignInFormProps = {}) {
  fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <SignInForm {...props} />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email = 'sara@example.com', password = 'gaza2026') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
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

describe('SignInForm', () => {
  it('shows a refusal above the fields, with its title and line', async () => {
    renderSignIn(() => refused(401, { type: 'unauthorized', code: 'INVALID_CREDENTIALS' }));

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t sign in');
    expect(alert).toHaveTextContent('The email or password is incorrect.');
  });

  it("shows a general refusal's reference", async () => {
    renderSignIn(() => refused(500, { type: 'server' }));

    await fillAndSubmit();

    expect(seen((await screen.findByRole('alert')).textContent)).toContain('Reference: req-1');
  });

  it('shows the wait for too many attempts as a status, with the submit disabled', async () => {
    renderSignIn(() => refused(429, { type: 'rate_limit' }, { 'retry-after': '90' }));

    await fillAndSubmit();

    const status = await screen.findByRole('status');
    expect(seen(status.textContent)).toBe('Too many attempts. Try again in 1:30.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('shows no connection as an alert with the offer to try again', async () => {
    renderSignIn(() => ({ failure: 'ERR_NETWORK' }));

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t connect');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('disables the fields and marks the submit busy while the server answers', async () => {
    const answer = deferred<FakeAnswer>();
    renderSignIn(() => answer.promise);

    await fillAndSubmit();

    const submit = screen.getByRole('button', { name: 'Sign in' });
    await waitFor(() => {
      expect(submit).toHaveAttribute('aria-busy', 'true');
    });
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();
    answer.resolve(ok(aSession()));
    await waitFor(() => {
      expect(submit).not.toHaveAttribute('aria-busy');
    });
  });

  it("describes each field by the server's error on it, and focuses the first in the form's order", async () => {
    renderSignIn(() =>
      refused(422, { type: 'validation', errors: { password: ['too_long'], email: ['too_long'] } }),
    );

    await fillAndSubmit();

    const email = screen.getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveFocus();
    });
    expect(email).toHaveAccessibleDescription('This is too long.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('This is too long.');
  });

  it('marks the fields that fail before sending, and focuses the first', async () => {
    renderSignIn(() => ok(aSession()));

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
  });

  it('shows the way to a forgotten password the page passes, under the password', () => {
    renderSignIn(() => ok(aSession()), { forgotPasswordLink: <a href="/forgot">Forgot?</a> });

    expect(screen.getByRole('link', { name: 'Forgot?' })).toHaveAttribute('href', '/forgot');
  });
});
