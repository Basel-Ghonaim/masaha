import { setLanguage } from '@shared/preferences';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { DocumentTitle } from './DocumentTitle';
import type { TitledHandle } from './titledHandle';

/** The titles below, each at a route of its own; `/plain` has none. */
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <DocumentTitle />
            <Outlet />
          </>
        ),
        children: [
          {
            path: '/about',
            handle: { title: (copy) => copy.site.links.about } satisfies TitledHandle,
            element: <Outlet />,
            children: [
              {
                path: 'sign-in',
                handle: { title: (copy) => copy.auth.signIn.title } satisfies TitledHandle,
                element: <p>A page</p>,
              },
            ],
          },
          { path: '/plain', element: <p>A page</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  startPreferences('en');
  document.title = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the document title', () => {
  it('names the page of the deepest route that has a title, then the site', async () => {
    renderAt('/about/sign-in');

    await waitFor(() => {
      expect(document.title).toBe('Sign in · Masaha');
    });
  });

  it('follows the interface’s language', async () => {
    renderAt('/about/sign-in');
    await waitFor(() => {
      expect(document.title).toBe('Sign in · Masaha');
    });

    act(() => {
      setLanguage('ar');
    });

    expect(document.title).toBe('تسجيل الدخول · مساحة');
  });

  it('follows a navigation to another page', async () => {
    const router = renderAt('/about/sign-in');
    await waitFor(() => {
      expect(document.title).toBe('Sign in · Masaha');
    });

    await act(() => router.navigate('/about'));

    expect(document.title).toBe('About Masaha · Masaha');
  });

  it('is the site’s name alone on a page whose route has no title', async () => {
    const router = renderAt('/about');
    await waitFor(() => {
      expect(document.title).toBe('About Masaha · Masaha');
    });

    await act(() => router.navigate('/plain'));

    expect(document.title).toBe('Masaha');
  });
});
