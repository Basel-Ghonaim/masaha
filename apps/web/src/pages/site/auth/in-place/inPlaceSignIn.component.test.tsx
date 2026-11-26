import { Toaster } from '@shared/design-system';
import { PasswordChangeGate } from '@shared/routing';
import { establishSession, passwordChanged, restoreSession } from '@shared/session';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { CLIENT_ID, clearGoogle, fakeGoogle } from '../../../../test/fakeGoogle';
import { sentPosition } from '../../../../test/fakeRecovery';
import { aSession, deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { publicSpace } from '../../../../test/publicSpace';
import { queryWrapper } from '../../../../test/queryWrapper';
import { stubScreenWidth } from '../../../../test/screenWidth';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { routeLoaders, warm } from '../../../../test/warmLazy';
import { siteRoutes } from '../../routes';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];
type Answer = () => FakeAnswer | Promise<FakeAnswer>;

const SPACE = '/spaces/noor-hub';
const FAVORITE_TITLE = 'Sign in to save spaces to your favourites';
const SAVE = /^Save .Noor Hub. to favourites$/;

/**
 * The site's server for «Noor Hub»'s page, with the answers a test gives by `method url`: the space,
 * its reads, no favourites, no recovery, and a favourite saved.
 */
function server(answers: Record<string, Answer> = {}) {
  return (request: Request) => {
    const own = answers[`${String(request.method)} ${String(request.url)}`];
    if (own !== undefined) return own();
    if (request.url === '/spaces') return ok([], 200);
    if (request.url === '/lookups') return ok({ governorates: [], areas: [], amenities: [] });
    if (request.url?.endsWith('/occupancy')) return ok({ status: null });
    if (request.url === '/me/favorites') return ok([]);
    if (request.url === '/auth/password/recovery') return ok({ step: 'request' });
    if (request.method === 'post') return { status: 204 };
    return ok(publicSpace());
  };
}

let router: ReturnType<typeof createBrowserRouter> | null = null;

/** The site at `path` on the window's own history, under the password change's gate, as the app. */
async function renderSite(answer: (request: Request) => FakeAnswer | Promise<FakeAnswer>) {
  window.history.replaceState(null, '', SPACE);
  const requests = fakeTransport(answer);
  router = createBrowserRouter([
    {
      HydrateFallback: () => null,
      element: (
        <PasswordChangeGate>
          <Outlet />
        </PasswordChangeGate>
      ),
      children: siteRoutes,
    },
  ]);
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <RouterProvider router={router} />
      <Toaster label="Notifications" />
    </Wrapper>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Noor Hub' });
  return requests;
}

const lineOf = ({ method, url }: Request) => `${String(method)} ${String(url)}`;
const favoritesPosted = (requests: Request[]) =>
  requests.map(lineOf).filter((line) => line === 'post /me/favorites/7');

/** The heart pressed by a guest, and the sign-in that opens over the page. */
async function pressHeart(user: ReturnType<typeof userEvent.setup>) {
  const heart = screen.getByRole('button', { name: SAVE });
  await user.click(heart);
  const dialog = await screen.findByRole('dialog', { name: FAVORITE_TITLE });
  // The forms load the first time it opens.
  await within(dialog).findByLabelText('Email');
  return { heart, dialog };
}

async function signInThere(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  email = 'sara@example.com',
) {
  await user.type(within(dialog).getByLabelText('Email'), email);
  await user.type(within(dialog).getByLabelText('Password'), 'gaza2026');
  await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
}

/** Resolves on the next move through the history. */
function nextMove() {
  return new Promise<void>((resolve) => {
    window.addEventListener(
      'popstate',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

const closed = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

// The pages, the shells and the sign-in's forms load lazily: their first transform is paid here.
beforeAll(async () => {
  await warm(
    ...routeLoaders(siteRoutes, SPACE),
    ...routeLoaders(siteRoutes, '/change-password'),
    () => import('./InPlaceSignIn'),
  );
}, 60_000);

beforeEach(async () => {
  // A step back the last test's overlay asked for as it closed lands first.
  await new Promise((resolve) => setTimeout(resolve, 50));
  startPreferences('en');
  stubScreenWidth(1440);
  // No Google unless a test offers it: a client id from a local .env would start loading Google's
  // own script, which never answers here, and the next test's fake would wait behind it.
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
  setSessionHint(false);
  await restoreSession();
});

afterEach(async () => {
  router?.dispose();
  router = null;
  restoreTransport();
  // The session a test signed in ends: with no hint, the restore finds none.
  setSessionHint(false);
  await act(() => restoreSession());
  localStorage.clear();
  clearGoogle();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.cookie = 'masaha_session=; Path=/; Max-Age=0';
});

describe('the sign-in over the page', () => {
  it('from the heart: signs in there, saves the space once and says so, the page kept and the focus back on the heart', async () => {
    const requests = await renderSite(server({ 'post /auth/login': () => ok(aSession()) }));
    const user = userEvent.setup();
    const { heart, dialog } = await pressHeart(user);

    await signInThere(user, dialog);

    await closed();
    expect(await findToast(/Noor Hub. saved to your favourites$/)).toBeInTheDocument();
    expect(favoritesPosted(requests)).toHaveLength(1);
    expect(window.location.pathname).toBe(SPACE);
    expect(window.history.state).not.toHaveProperty('masahaOverlay');
    await waitFor(() => {
      expect(heart).toHaveFocus();
    });
  });

  it('draws one main action in each view: its form’s submit, or the open link’s way on', async () => {
    await renderSite(
      server({
        'get /auth/password/recovery': () => ok({ step: 'password', email: 's•••@example.com' }),
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    const mainActions = () =>
      Array.from(dialog.querySelectorAll('[data-slot="button"]')).filter((button) =>
        button.classList.contains('bg-main-action'),
      );

    expect(mainActions()).toEqual([within(dialog).getByRole('button', { name: 'Sign in' })]);

    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    await within(dialog).findByLabelText('Name');
    expect(mainActions()).toEqual([within(dialog).getByRole('button', { name: 'Create account' })]);

    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Forgot password?' }));
    const onward = await within(dialog).findByRole('link', { name: /^Set a new password/ });
    expect(mainActions()).toEqual([onward]);
  });

  it('from the report: signs in there, and the report’s dialog opens', async () => {
    await renderSite(server({ 'post /auth/login': () => ok(aSession()) }));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Report wrong information' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign in to report information' });
    await within(dialog).findByLabelText('Email');

    await signInThere(user, dialog);

    expect(
      await screen.findByRole('dialog', { name: 'Report wrong information' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(SPACE);

    // Closed, it lets the held report go, so the next test's sign-in opens nothing.
    await user.keyboard('{Escape}');
    await closed();
  });

  it('registers there: titled by the reason, the email carried, the space saved', async () => {
    const requests = await renderSite(
      server({ 'post /auth/register': () => ok(aSession({ name: 'Sara' }), 201) }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    await user.type(within(dialog).getByLabelText('Email'), 'sara@example.com');

    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));

    const title = within(dialog).getByRole('heading', {
      name: 'Create an account to save spaces to your favourites',
    });
    await waitFor(() => {
      expect(title).toHaveFocus();
    });
    expect(within(dialog).getByLabelText('Email')).toHaveValue('sara@example.com');
    await user.type(within(dialog).getByLabelText('Name'), 'Sara');
    await user.type(within(dialog).getByLabelText('Password'), 'gaza2026');
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await closed();
    await waitFor(() => {
      expect(favoritesPosted(requests)).toHaveLength(1);
    });
  });

  it('signs in with Google there, its one button kept as the view switches', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
    const google = fakeGoogle();
    google.install();
    const requests = await renderSite(
      server({ 'post /auth/google': () => ok({ ...aSession(), linked: false, created: false }) }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    const button = await within(dialog).findByRole('button', { name: 'Continue with Google' });

    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(within(dialog).getByRole('button', { name: 'Continue with Google' })).toBe(button);
    act(() => {
      google.choose('google-id-token');
    });

    await closed();
    expect(requests.map(lineOf).filter((line) => line === 'post /auth/google')).toHaveLength(1);
    await waitFor(() => {
      expect(favoritesPosted(requests)).toHaveLength(1);
    });
  });

  it('shows wrong credentials there, the action still held for the sign-in that follows', async () => {
    let tries = 0;
    const requests = await renderSite(
      server({
        'post /auth/login': () => {
          tries += 1;
          return tries === 1
            ? refused(401, { type: 'unauthorized', code: 'INVALID_CREDENTIALS' })
            : ok(aSession());
        },
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);

    await signInThere(user, dialog);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    );
    expect(screen.getByRole('dialog', { name: FAVORITE_TITLE })).toBe(dialog);
    expect(favoritesPosted(requests)).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
    await closed();
    await waitFor(() => {
      expect(favoritesPosted(requests)).toHaveLength(1);
    });
  });

  it('counts down too many attempts with the sign-in off, and sends nothing by itself', async () => {
    const requests = await renderSite(
      server({
        'post /auth/login': () => refused(429, { type: 'rate_limit' }, { 'retry-after': '300' }),
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);

    await signInThere(user, dialog);

    const status = await within(dialog).findByText(/Too many attempts. Try again in .5:00/);
    expect(status).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(requests.map(lineOf).filter((line) => line === 'post /auth/login')).toHaveLength(1);
  });

  it('with a temporary password, goes to the change first, the action waiting until it is done', async () => {
    const requests = await renderSite(
      server({
        'post /auth/login': () => ok(aSession({ id: 1, mustChangePassword: true })),
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);

    await signInThere(user, dialog);

    await waitFor(() => {
      expect(`${window.location.pathname}${window.location.search}`).toBe(
        `/change-password?next=${encodeURIComponent(SPACE)}`,
      );
    });
    expect(favoritesPosted(requests)).toHaveLength(0);

    act(() => {
      passwordChanged(1, 'token-2');
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe(SPACE);
    });
    await waitFor(() => {
      expect(favoritesPosted(requests)).toHaveLength(1);
    });
  });

  it.each(['Escape', 'the close button', 'Back'])(
    'closed with %s, lets the action go: a later sign-in saves nothing',
    async (way) => {
      const requests = await renderSite(server());
      const user = userEvent.setup();
      const { dialog } = await pressHeart(user);

      if (way === 'Escape') await user.keyboard('{Escape}');
      if (way === 'the close button') {
        await user.click(within(dialog).getByRole('button', { name: 'Close' }));
      }
      if (way === 'Back') {
        const moved = nextMove();
        window.history.back();
        await moved;
      }
      await closed();

      act(() => {
        // A sign-in in this tab the guest made otherwise, on the sign-in page, say.
        establishSession(aSession(), { source: 'signIn' });
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(favoritesPosted(requests)).toHaveLength(0);
      expect(localStorage.getItem('masaha.heldIntent')).toBeNull();
    },
  );

  it('holds every way of closing while the sign-in is under way', async () => {
    const answer = deferred<FakeAnswer>();
    await renderSite(server({ 'post /auth/login': () => answer.promise }));
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);

    await signInThere(user, dialog);
    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: 'Close' })).toBeDisabled();
    });
    await user.keyboard('{Escape}');
    const moved = nextMove();
    window.history.back();
    await moved;

    expect(screen.getByRole('dialog', { name: FAVORITE_TITLE })).toBe(dialog);
    answer.resolve(ok(aSession()));
    await closed();
  });

  it('holds Google and the views’ switches while a password sign-in is under way (N-1)', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
    fakeGoogle().install();
    const answer = deferred<FakeAnswer>();
    await renderSite(server({ 'post /auth/login': () => answer.promise }));
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    const google = await within(dialog).findByRole('button', { name: 'Continue with Google' });

    await signInThere(user, dialog);

    await waitFor(() => {
      expect(google.closest('[inert]')).not.toBeNull();
    });
    expect(within(dialog).getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Forgot password?' })).toBeDisabled();
    answer.resolve(ok(aSession()));
    await closed();
  });

  it('asks for a reset link there: the email carried, the link sent, and what completes after the reset', async () => {
    const requests = await renderSite(
      server({ 'post /auth/password/forgot': () => ok(sentPosition(), 202) }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    // The action was held ten minutes ago: asking for a link starts its life again.
    const held = JSON.parse(localStorage.getItem('masaha.heldIntent') ?? '{}') as { at: number };
    localStorage.setItem(
      'masaha.heldIntent',
      JSON.stringify({ ...held, at: Date.now() - 10 * 60 * 1000 }),
    );
    await user.type(within(dialog).getByLabelText('Email'), 'sara@example.com');

    await user.click(within(dialog).getByRole('button', { name: 'Forgot password?' }));

    const title = within(dialog).getByRole('heading', { name: 'Forgot password' });
    await waitFor(() => {
      expect(title).toHaveFocus();
    });
    const back = within(dialog).getByRole('button', { name: 'Back to sign in' });
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await within(dialog).findByLabelText('Email')).toHaveValue('sara@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Send reset link' }));

    const sentTitle = await within(dialog).findByRole('heading', { name: 'Check your email' });
    // The pressed submit is gone: the focus goes to the new title, not the dialog's container.
    await waitFor(() => {
      expect(sentTitle).toHaveFocus();
    });
    expect(dialog).toHaveTextContent('s•••@example.com');
    // The email typed is the server's to hold, never this browser's (D2 = B).
    expect(localStorage.getItem('masaha.heldIntent')).not.toContain('sara@');
    expect(dialog).toHaveTextContent(
      /Once your new password is set, we bring you back to .Noor Hub. and finish saving it to your favourites\./,
    );
    expect(within(dialog).getByRole('button', { name: /Resend in/ })).toBeDisabled();
    const renewed = JSON.parse(localStorage.getItem('masaha.heldIntent') ?? '{}') as { at: number };
    expect(Date.now() - renewed.at).toBeLessThan(60_000);
    expect(requests.map(lineOf)).toContain('post /auth/password/forgot');

    await user.click(within(dialog).getByRole('button', { name: 'Use another email' }));
    const email = await within(dialog).findByLabelText('Email');
    expect(email).toHaveValue('');
    await waitFor(() => {
      expect(email).toHaveFocus();
    });
  });

  it('turns into the sign-in once a reset completes in another tab, the email filled and the password focused (A1)', async () => {
    await renderSite(server({ 'post /auth/password/forgot': () => ok(sentPosition(), 202) }));
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    await user.type(within(dialog).getByLabelText('Email'), 'sara@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Forgot password?' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Send reset link' }));
    await within(dialog).findByRole('heading', { name: 'Check your email' });

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'masaha.theme', newValue: 'dark' }));
    });
    expect(within(dialog).getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'masaha.recoveredAt', newValue: String(Date.now()) }),
      );
    });

    expect(
      await within(dialog).findByRole('heading', { name: FAVORITE_TITLE }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Your password was changed');
    expect(within(dialog).getByLabelText('Email')).toHaveValue('sara@example.com');
    await waitFor(() => {
      expect(within(dialog).getByLabelText('Password')).toHaveFocus();
    });
  });

  it('leads from an email that has an account to the sign-in with it, the password focused', async () => {
    await renderSite(
      server({
        'post /auth/register': () =>
          refused(409, {
            type: 'conflict',
            code: 'EMAIL_TAKEN',
            errors: { email: ['not_unique'] },
          }),
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    await user.type(within(dialog).getByLabelText('Name'), 'Sara');
    await user.type(within(dialog).getByLabelText('Email'), 'sara@example.com');
    await user.type(within(dialog).getByLabelText('Password'), 'gaza2026');
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));

    await user.click(
      await within(dialog).findByRole('button', { name: 'Sign in with this email' }),
    );

    expect(within(dialog).getByRole('heading', { name: FAVORITE_TITLE })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveValue('sara@example.com');
    await waitFor(() => {
      expect(within(dialog).getByLabelText('Password')).toHaveFocus();
    });
  });

  it('offers the reset link’s request when Google refuses to join an account with that email', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
    const google = fakeGoogle();
    google.install();
    await renderSite(
      server({
        'post /auth/google': () =>
          refused(409, { type: 'conflict', code: 'GOOGLE_LINK_NOT_ALLOWED' }),
      }),
    );
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    await within(dialog).findByRole('button', { name: 'Continue with Google' });

    act(() => {
      google.choose('google-id-token');
    });
    const alert = await within(dialog).findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: 'Forgot password?' }));

    expect(
      await within(dialog).findByRole('heading', { name: 'Forgot password' }),
    ).toBeInTheDocument();
  });

  it('opens the privacy policy in a new tab, and says so', async () => {
    await renderSite(server());
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);

    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));

    const link = within(dialog).getByRole('link', {
      name: /^privacy policy\s*\(opens in a new tab\)$/,
    });
    expect(link).toHaveAttribute('href', '/privacy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('only signs in when the action is no longer held: its 15 minutes passed', async () => {
    // The clock the hold reads, faked for the press and its 15 minutes, then real again.
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const requests = await renderSite(server({ 'post /auth/login': () => ok(aSession()) }));
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    });
    vi.useRealTimers();
    // The copy in the browser's storage, past its life on the real clock too.
    localStorage.setItem(
      'masaha.heldIntent',
      JSON.stringify({
        ...(JSON.parse(localStorage.getItem('masaha.heldIntent') ?? '{}') as object),
        at: Date.now() - 15 * 60 * 1000 - 1,
      }),
    );

    await signInThere(user, dialog);

    await closed();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(favoritesPosted(requests)).toHaveLength(0);
    expect(window.location.pathname).toBe(SPACE);
  });

  it.each([390, 1280])('at %i px, moves the focus to each view’s title', async (width) => {
    stubScreenWidth(width);
    await renderSite(server());
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    expect(within(dialog).getByRole('heading', { name: FAVORITE_TITLE })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    const register = within(dialog).getByRole('heading', {
      name: 'Create an account to save spaces to your favourites',
    });
    await waitFor(() => {
      expect(register).toHaveFocus();
    });

    await user.click(within(dialog).getByRole('button', { name: 'Sign in' }));
    await user.click(within(dialog).getByRole('button', { name: 'Forgot password?' }));
    await waitFor(() => {
      expect(within(dialog).getByRole('heading', { name: 'Forgot password' })).toHaveFocus();
    });
  });

  /** Opens the sign-in over the page and goes to `view`, as the guest would. */
  async function openView(view: 'signIn' | 'register' | 'forgot' | 'sent' | 'changed') {
    const user = userEvent.setup();
    const { dialog } = await pressHeart(user);
    if (view === 'register') {
      await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    }
    if (view === 'forgot' || view === 'sent' || view === 'changed') {
      await user.type(within(dialog).getByLabelText('Email'), 'sara@example.com');
      await user.click(within(dialog).getByRole('button', { name: 'Forgot password?' }));
      await within(dialog).findByRole('button', { name: 'Send reset link' });
    }
    if (view === 'sent' || view === 'changed') {
      await user.click(within(dialog).getByRole('button', { name: 'Send reset link' }));
      await within(dialog).findByRole('heading', { name: 'Check your email' });
    }
    if (view === 'changed') {
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', { key: 'masaha.recoveredAt', newValue: String(Date.now()) }),
        );
      });
      await within(dialog).findByText('Your password was changed');
    }
  }

  it.each(
    [390, 1280].flatMap((width) =>
      (['signIn', 'register', 'forgot', 'sent', 'changed'] as const).map(
        (view) => [width, view] as const,
      ),
    ),
  )('at %i px, the %s view is axe-clean', async (width, view) => {
    stubScreenWidth(width);
    await renderSite(server({ 'post /auth/password/forgot': () => ok(sentPosition(), 202) }));

    await openView(view);

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
