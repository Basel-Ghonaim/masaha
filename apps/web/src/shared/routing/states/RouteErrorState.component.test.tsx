import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { reloadPage } from './reloadPage';
import { RouteErrorState } from './RouteErrorState';

// jsdom cannot reload a page, so the reload is a stand-in the tests can count.
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

/** A route that fails to render, with the error state as its boundary. */
async function renderFailingRoute() {
  const router = createMemoryRouter([
    {
      path: '/',
      Component: () => {
        throw new Error('The page broke');
      },
      ErrorBoundary: RouteErrorState,
    },
  ]);
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
}

beforeEach(() => {
  startPreferences('en');
  // React reports the error the route throws; it is the scenario here, not a failure.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(reloadPage).mockClear();
});

describe('RouteErrorState', () => {
  it('reloads the page when Try again is pressed', async () => {
    const user = userEvent.setup();
    await renderFailingRoute();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('reloads the page when the connection comes back, while offline', async () => {
    vi.spyOn(Navigator.prototype, 'onLine', 'get').mockReturnValue(false);
    await renderFailingRoute();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No internet connection');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('does not reload on its own when the error is not the connection', async () => {
    await renderFailingRoute();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Something went wrong');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(reloadPage).not.toHaveBeenCalled();
  });
});
