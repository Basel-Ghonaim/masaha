import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { MASKED_EMAIL, sentPosition } from '../../../../test/fakeRecovery';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ForgotPasswordCard } from './ForgotPasswordCard';

/** The card, its links stood in for, the recovery's read answered by `read`. */
function renderCard(read: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(read);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ForgotPasswordCard
        signInLink={<a href="/login">Back to sign in</a>}
        contactLink={<a href="/about#contact">Contact us</a>}
      />
    </QueryClientProvider>,
  );
}

/** The card at the step `position`. */
function renderAt(position: RecoveryPosition) {
  renderCard(() => ok(position));
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
});

describe('ForgotPasswordCard', () => {
  it('shows the wait while the recovery is read, under the page’s title', async () => {
    const answer = deferred<FakeAnswer>();
    renderCard(() => answer.promise);

    expect(screen.getByRole('heading', { level: 1, name: 'Forgot password' })).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Loading' })).toBeInTheDocument();
    answer.resolve(ok({ step: 'request' }));
  });

  it('shows the email form without a recovery', async () => {
    renderAt({ step: 'request' });

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Forgot password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });

  it('shows the link sent, the masked address and the resend held by its window', async () => {
    renderAt(sentPosition({ resendInSeconds: 60 }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Check your email' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/If this email is registered with us/)).toBeInTheDocument();
    expect(seen(screen.getByText(/^Sent to/).textContent)).toBe(`Sent to ${MASKED_EMAIL}`);
    const resend = screen.getByRole('button', { name: /^Resend in/ });
    expect(seen(resend.textContent)).toBe('Resend in 1:00');
    expect(resend).toBeDisabled();
  });

  it('offers to enter the email again, and no resend, once the resends are spent', async () => {
    renderAt(sentPosition({ canResend: false }));

    expect(await screen.findByRole('button', { name: 'Enter your email again' })).toBeEnabled();
    expect(screen.getByText(/asked for the link too many times/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resend/ })).not.toBeInTheDocument();
  });

  it('offers a new link once one is open in this browser', async () => {
    renderAt({ step: 'password', email: MASKED_EMAIL });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'You’ve opened a reset link' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter your email again' })).toBeEnabled();
  });

  it('offers a retry when the recovery cannot be read', async () => {
    renderCard(() => refused(403, { type: 'forbidden' }));

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('keeps the ways out at its foot', async () => {
    renderAt({ step: 'request' });

    await screen.findByLabelText('Email');
    expect(screen.getByText('Can’t access your email?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeInTheDocument();
  });
});
