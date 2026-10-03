import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../test/startPreferences';
import { routes } from './router';

// The site's shell, replaced by one with a header that fails while it renders.
vi.mock('../pages/site/shell/SiteLayout', async () => {
  const { Outlet } = await import('react-router');
  function Broken(): never {
    throw new Error('The site shell broke');
  }
  return {
    SiteLayout: () => (
      <>
        <header />
        <Broken />
        <Outlet />
      </>
    ),
  };
});

beforeEach(() => {
  startPreferences('en');
  // jsdom does not scroll, and the root restores the scroll position.
  vi.stubGlobal('scrollTo', () => undefined);
  // React reports the error the shell throws; it is the scenario here, not a failure.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the app's route tree", () => {
  it("shows the root's general error, with no header, when the site shell fails", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
