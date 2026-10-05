import type { RecoveryPosition } from '@masaha/shared/auth';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { MASKED_EMAIL } from '../../../../test/fakeRecovery';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { ResetPasswordCard } from './ResetPasswordCard';

/** A request, as the fake server receives it. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const PASSWORD: RecoveryPosition = { step: 'password', email: MASKED_EMAIL };

/** The card at `address`, its links stood in for, the server answering with `answer`. */
function renderCard(
  address: string,
  answer: (config: Request) => FakeAnswer | Promise<FakeAnswer>,
) {
  window.history.replaceState(null, '', address);
  fakeTransport(answer);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[address]}>
        <ResetPasswordCard
          requestLinkLink={<a href="/forgot-password">Request a new link</a>}
          signInLink={<a href="/login">Sign in</a>}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
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
  window.history.replaceState(null, '', '/');
});

describe('ResetPasswordCard', () => {
  it('shows the wait while the link is checked, under the page’s title', async () => {
    const answer = deferred<FakeAnswer>();
    renderCard('/reset-password#token=link-token', () => answer.promise);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Set a new password' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Loading' })).toBeInTheDocument();
    answer.resolve(ok(PASSWORD));
  });

  it('shows the new password for the account’s masked email, with its rules', async () => {
    renderCard('/reset-password', () => ok(PASSWORD));

    const field = await screen.findByLabelText('New password');
    expect(seen(screen.getByText(/^For /).textContent)).toBe(`For ${MASKED_EMAIL}`);
    expect(field).toHaveAccessibleDescription(/8 characters/);
    expect(screen.getByRole('button', { name: 'Save password' })).toBeEnabled();
  });

  it('says the password was set, and offers to sign in', async () => {
    renderCard('/reset-password', (config) =>
      config.method === 'get' ? ok(PASSWORD) : { status: 204 },
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your password was changed, and you were signed out on all devices',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sign in with your new password.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('says the link can no longer be used, and offers a new one', async () => {
    renderCard('/reset-password#token=used', () =>
      refused(400, { type: 'bad_request', code: 'RESET_TOKEN_INVALID' }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'The link has expired or was already used',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Reset links are valid for one hour and can be used once.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('shows why the check failed, and to open the link again', async () => {
    renderCard('/reset-password#token=link-token', () => refused(500, { type: 'server' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t check the link');
    expect(seen(alert.textContent)).toContain('Reference: req-1');
    expect(screen.getByText('Open the link in your email again.')).toBeInTheDocument();
  });

  it('offers to check the link again when the check got no answer', async () => {
    renderCard('/reset-password#token=link-token', () => ({ failure: 'ERR_NETWORK' }));

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(retry).toBeEnabled();
    expect(
      within(retry.closest('[data-slot="empty-state"]') ?? document.body).getByRole('heading', {
        name: 'No internet connection',
      }),
    ).toBeInTheDocument();
  });
});
