import type { MyAccount } from '@masaha/shared/users';
import { establishSession } from '@shared/session';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AccountSettingsPage } from './AccountSettingsPage';

/** A Google-only account: no password yet. */
const GOOGLE_ONLY: MyAccount = {
  id: 1,
  name: 'Sara',
  email: 'sara@example.com',
  language: 'en',
  role: 'USER',
  hasPassword: false,
  hasGoogle: true,
};

/** A request, as the fake server receives it. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** The page, `GET /me` answering the Google-only account, the link's request answered by `link`. */
function renderPage(link: (request: Request) => FakeAnswer) {
  const requests = fakeTransport((request) =>
    request.method === 'get' && request.url === '/me' ? ok(GOOGLE_ONLY) : link(request),
  );
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <AccountSettingsPage />
    </Wrapper>,
  );
  return requests;
}

/** Text with the isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ id: 1, name: 'Sara', language: 'en' }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
});

describe('the account settings page’s set-password link (screen 9)', () => {
  it('sends the link, then draws the link sent: the masked address and the resend with its wait', async () => {
    const user = userEvent.setup();
    const requests = renderPage(() =>
      ok({ step: 'sent', email: 's***@example.com', canResend: true, resendInSeconds: 60 }),
    );

    const card = (await screen.findByRole('heading', { level: 2, name: 'Signing in' })).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    await user.click(
      await within(card).findByRole('button', { name: 'Send a link to set a password' }),
    );

    expect(
      await within(card).findByText(
        'We sent a link to set your password to your email. The link is valid for one hour. Check your spam folder.',
      ),
    ).toBeInTheDocument();
    expect(within(card).getByText(heard('Sent to s***@example.com'))).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: heard('Resend in 1:00') })).toBeDisabled();
    const sent = requests.find(
      (request) => request.method === 'post' && request.url === '/auth/password/forgot',
    );
    expect(JSON.parse(String(sent?.data))).toEqual({ email: 'sara@example.com' });
  });

  it('holds the button while a 429 runs, saying how long to wait', async () => {
    const user = userEvent.setup();
    renderPage(() => refused(429, { type: 'rate_limited' }, { 'retry-after': '120' }));

    const send = await screen.findByRole('button', { name: 'Send a link to set a password' });
    await user.click(send);

    expect(await screen.findByText(heard('Too many attempts. Try again in 2:00.'))).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send a link to set a password' })).toBeDisabled();
  });
});
