import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { SkipLink } from './SkipLink';
import { useMainFocus } from './useMainFocus';

/** A shell as every shell is: the skip link first, a link of its header, then its `main`. */
function Shell({ name }: { name: string }) {
  useMainFocus();
  return (
    <>
      <SkipLink />
      <a href="/elsewhere">{`${name} header link`}</a>
      <main id="main" tabIndex={-1} aria-label={name}>
        <Outlet />
      </main>
    </>
  );
}

// Two shells of their own types, as the site's and the focus shell are: React never reuses one's
// `main` for the other's.
function SiteShell() {
  return <Shell name="Site" />;
}
function FocusShell() {
  return <Shell name="Focus" />;
}

/** Two shells, as the site's and the focus shell: the site's pages, and sign-in apart. */
function renderShells(initial: string) {
  const router = createMemoryRouter(
    [
      {
        element: <SiteShell />,
        children: [
          { path: '/', element: <h1>Home</h1> },
          { path: '/spaces', element: <h1>Spaces</h1> },
          {
            path: '/about',
            element: (
              <>
                <h1>About</h1>
                <h2 id="owners" tabIndex={-1}>
                  For owners
                </h2>
                <h2 id="contact" tabIndex={-1}>
                  Contact us
                </h2>
                {/* A card named by the hash, which takes no focus itself: its heading does. */}
                <section id="hours">
                  <h2 tabIndex={-1}>Opening hours</h2>
                </section>
              </>
            ),
          },
          // A guard's answer on load: the page asked for is replaced by another shell's.
          { path: '/me', element: <Navigate to="/login" replace /> },
        ],
      },
      {
        element: <FocusShell />,
        children: [{ path: '/login', element: <h1>Sign in</h1> }],
      },
    ],
    { initialEntries: [initial] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const main = (name: string) => screen.getByRole('main', { name });

beforeEach(() => {
  startPreferences('en');
});

describe('the focus on a page change', () => {
  it('leaves the first page’s focus where it is, also after a guard replaced the page on load', async () => {
    renderShells('/me');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(main('Focus')).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('moves the focus to main on a later page', async () => {
    const router = renderShells('/');
    expect(main('Site')).not.toHaveFocus();

    await act(async () => {
      await router.navigate('/spaces');
    });

    await waitFor(() => {
      expect(main('Site')).toHaveFocus();
    });
  });

  it('focuses the site’s main on Back from the focus shell', async () => {
    const router = renderShells('/');
    await act(async () => {
      await router.navigate('/login');
    });
    await waitFor(() => {
      expect(main('Focus')).toHaveFocus();
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(main('Site')).toHaveFocus();
    });
  });

  it('focuses the section a hash names, also when only the hash changes', async () => {
    const router = renderShells('/');

    await act(async () => {
      await router.navigate('/about#owners');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'For owners' })).toHaveFocus();
    });

    await act(async () => {
      await router.navigate('/about#contact');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Contact us' })).toHaveFocus();
    });
  });

  it('focuses the heading of a card the hash names when the card takes no focus itself', async () => {
    const router = renderShells('/about');
    await act(async () => {
      await router.navigate('/about#owners');
    });

    await act(async () => {
      await router.navigate('/about#hours');
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Opening hours' })).toHaveFocus();
    });
  });

  it('moves nothing when only the search changes', async () => {
    const router = renderShells('/');
    await act(async () => {
      await router.navigate('/spaces');
    });
    const link = screen.getByRole('link', { name: 'Site header link' });
    link.focus();

    await act(async () => {
      await router.navigate('/spaces?page=2');
    });

    expect(link).toHaveFocus();
  });
});
