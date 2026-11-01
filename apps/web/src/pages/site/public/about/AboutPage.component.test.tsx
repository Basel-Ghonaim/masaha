import { createQueryClient } from '@shared/api';
import { restoreSession } from '@shared/session';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreTransport } from '../../../../test/fakeTransport';
import { setSessionHint } from '../../../../test/sessionHint';
import { startPreferences } from '../../../../test/startPreferences';
import { siteRoutes } from '../../routes';

/** The site's routes, as the app mounts them, at `path`; returns the router. */
function renderSite(path: string) {
  const router = createMemoryRouter([{ HydrateFallback: () => null, children: siteRoutes }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

// The router loads the shell and the pages lazily: their first transform is paid here, before any
// test waits on them (finding 87's family; no timeout raised).
beforeAll(async () => {
  await Promise.all([
    import('../../shell/SiteLayout'),
    import('../home/HomePage'),
    import('./AboutPage'),
  ]);
});

beforeEach(async () => {
  startPreferences('en');
  setSessionHint(false);
  await restoreSession();
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('the about page', () => {
  it('says «contact us» once in the freshness note, as its link to the contact section', async () => {
    renderSite('/about');

    const note = await screen.findByText(
      (_text, element) => element?.tagName === 'P' && element.textContent.startsWith('“Updated”'),
    );
    expect(note).toHaveTextContent(
      '“Updated” is the last time we confirmed the information or the space updated it. The longer ago, the more likely it has changed, so we show “May have changed” next to old information. If you find wrong information, contact us.',
    );
    expect(within(note).getByRole('link', { name: 'contact us' })).toHaveAttribute(
      'href',
      '#contact',
    );
    expect(note.textContent.match(/contact us/gi)).toHaveLength(1);
  });

  it('marks the verified card with its icon, and offers «Browse spaces» as the primary action', async () => {
    renderSite('/about');

    const verified = await screen.findByRole('heading', { level: 3, name: 'Verified space' });
    expect(verified.querySelector('svg')).toHaveClass('lucide-circle-check');
    const browse = within(screen.getByRole('main')).getByRole('link', { name: 'Browse spaces' });
    expect(browse).toHaveAttribute('href', '/spaces');
    expect(browse).toHaveClass('bg-primary', 'w-full', 'md:w-auto');
  });

  it('asks for a question, an unanswered report or a mistake in its contact section', async () => {
    renderSite('/about');

    expect(
      await screen.findByText(
        'Write to us with a question, about a report that got no reply, or about a mistake on the site.',
      ),
    ).toBeInTheDocument();
  });

  it('focuses the section a link names, from another page and on About itself', async () => {
    const router = renderSite('/');
    await screen.findByRole('heading', { level: 1 });

    await act(async () => {
      await router.navigate('/about#owners');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'For space owners' })).toHaveFocus();
    });

    await act(async () => {
      await router.navigate('/about#contact');
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Contact us' })).toHaveFocus();
    });
  });
});
