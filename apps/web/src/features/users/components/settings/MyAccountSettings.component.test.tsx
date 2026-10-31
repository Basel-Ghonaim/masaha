import type { MyAccount } from '@masaha/shared/users';
import { Toaster, toast } from '@shared/design-system';
import { getPreferences } from '@shared/preferences';
import { establishSession, getSession } from '@shared/session';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { aSession } from '../../../../test/fakeSession';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { MyAccountSettings } from './MyAccountSettings';

/** A request, as the fake server receives it. */
type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const ACCOUNT: MyAccount = {
  id: 1,
  name: 'Sara',
  email: 'sara@example.com',
  language: 'en',
  role: 'USER',
  hasPassword: true,
  hasGoogle: false,
};

const lineOf = ({ method, url }: Request) => `${String(method)} ${String(url)}`;

/** The settings, `GET /me` answering `account`, every other request answered by `write`. */
function renderSettings(
  account: MyAccount = ACCOUNT,
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = (request) =>
    ok({ ...account, ...(JSON.parse(String(request.data ?? '{}')) as object) }),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' && request.url === '/me' ? ok(account) : write(request),
  );
  const Wrapper = queryWrapper();
  const view = render(
    <Wrapper>
      <MyAccountSettings />
      <Toaster label="Notifications" />
    </Wrapper>,
  );
  return { ...view, requests };
}

beforeEach(() => {
  startPreferences('en');
  establishSession(aSession({ id: 1, name: 'Sara', language: 'en' }), { source: 'signIn' });
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('MyAccountSettings', () => {
  it('draws the profile, the preferences and the ways of signing in; axe-clean', async () => {
    const { container } = renderSettings();

    expect(await screen.findByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Signing in' })).toBeInTheDocument();
    expect(screen.getByText('sara@example.com')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('You sign in with this email')).toBeInTheDocument();
    // Landmarks belong to a page, not to a component, so that rule is off.
    expect(await axe(container, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });

  it('says it could not load the account, with a retry', async () => {
    fakeTransport(() => refused(403, { type: 'forbidden' }));
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <MyAccountSettings />
      </Wrapper>,
    );

    expect(await screen.findByText('Couldn’t load your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('the profile saves the name and the menu shows it at once', async () => {
    const user = userEvent.setup();
    const { requests } = renderSettings();
    const name = await screen.findByLabelText('Name');

    await user.clear(name);
    await user.type(name, 'Sara Ali');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await findToast('Changes saved')).toBeVisible();
    expect(requests.map(lineOf)).toContain('patch /me');
    expect(getSession().user?.name).toBe('Sara Ali');
  });

  it('choosing Arabic applies at once and saves it to the account', async () => {
    const user = userEvent.setup();
    const { requests } = renderSettings();

    await user.click(await screen.findByRole('radio', { name: 'العربية' }));

    expect(getPreferences().language).toBe('ar');
    await waitFor(() => {
      expect(requests.map(lineOf)).toContain('patch /me');
    });
    expect(JSON.parse(String(requests.at(-1)?.data))).toEqual({ language: 'ar' });
    await waitFor(() => {
      expect(getSession().user?.language).toBe('ar');
    });
  });

  it('a failed language save puts the choice back with a retry', async () => {
    const user = userEvent.setup();
    renderSettings(ACCOUNT, () => refused(403, { type: 'forbidden' }));

    await user.click(await screen.findByRole('radio', { name: 'العربية' }));

    expect(await findToast('Couldn’t save the language')).toBeVisible();
    expect(getPreferences().language).toBe('en');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('the theme offers «Device setting», stored on the device only', async () => {
    const user = userEvent.setup();
    const { requests } = renderSettings();

    await user.click(await screen.findByRole('radio', { name: 'Dark' }));

    expect(getPreferences().themeChoice).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Device setting' })).toBeInTheDocument();
    expect(requests.map(lineOf)).toEqual(['get /me']);
  });

  it('a Google account shows «Linked»; a password account «Change»', async () => {
    renderSettings({ ...ACCOUNT, hasGoogle: true });

    const card = within(
      (await screen.findByRole('heading', { level: 2, name: 'Signing in' })).closest(
        '[data-slot="card"]',
      ) as HTMLElement,
    );
    expect(card.getByText('Linked')).toBeInTheDocument();
    expect(card.getByText(/^You sign in with Google · .sara@example\.com.$/)).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Change' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('a password account without Google shows no Google row', async () => {
    renderSettings();

    expect(await screen.findByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(screen.queryByText('Linked')).not.toBeInTheDocument();
  });

  it('the password change opens focused, closes once saved, says it signed out the others, and focuses «Change»', async () => {
    const user = userEvent.setup();
    const { requests } = renderSettings(ACCOUNT, () => ok({ accessToken: 'token-renewed' }));

    await user.click(await screen.findByRole('button', { name: 'Change' }));
    const current = screen.getByLabelText('Current password');
    expect(current).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Change' })).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText('Changing your password signs you out on all your other devices'),
    ).toBeInTheDocument();
    await user.type(current, 'old-pass1');
    await user.type(screen.getByLabelText('New password'), 'gaza2026x');
    await user.click(screen.getByRole('button', { name: 'Save password' }));

    expect(
      await findToast('Password changed, and you were signed out on your other devices'),
    ).toBeVisible();
    expect(requests.map(lineOf)).toContain('post /me/password');
    expect(getSession().accessToken).toBe('token-renewed');
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toHaveFocus();
  });

  it('«Back» closes the change and focuses «Change»', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toHaveFocus();
  });

  it('a Google-only account sends the set-password link and says it was sent', async () => {
    const user = userEvent.setup();
    const { requests } = renderSettings({ ...ACCOUNT, hasPassword: false, hasGoogle: true }, () =>
      ok({ step: 'sent', email: 's***@example.com', canResend: true, resendInSeconds: 60 }),
    );

    expect(await screen.findByText('Not set yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send a link to set a password' }));

    expect(
      await screen.findByText(
        'We sent a link to set your password to your email. The link is valid for one hour. Check your spam folder.',
      ),
    ).toBeInTheDocument();
    const sent = requests.find((request) => lineOf(request) === 'post /auth/password/forgot');
    expect(JSON.parse(String(sent?.data))).toEqual({ email: 'sara@example.com' });
  });
});
