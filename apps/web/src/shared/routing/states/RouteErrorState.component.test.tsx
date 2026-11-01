import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPreferences } from '../../../test/startPreferences';
import { reloadPage } from './reloadPage';
import { RouteErrorState } from './RouteErrorState';

// jsdom cannot reload a page, so the reload is a stand-in the tests can count.
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

/** A route that fails to render while `failing` says so, with the error state as its boundary. */
async function renderFailingRoute(failing: () => boolean = () => true) {
  const router = createMemoryRouter([
    {
      path: '/',
      Component: () => {
        if (failing()) throw new Error('The page broke');
        return <h1>The page</h1>;
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
  it('runs the route again in place when Try again is pressed, the page back once it renders', async () => {
    const user = userEvent.setup();
    let broken = true;
    await renderFailingRoute(() => broken);

    broken = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'The page' })).toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('says the error is still there after a second failure in a row', async () => {
    const user = userEvent.setup();
    await renderFailingRoute();
    expect(screen.queryByText(/The error is still there/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByText('The error is still there. Try again in a little while.'),
    ).toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('reloads the page when its code could not be fetched', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        path: '/',
        Component: () => {
          throw new Error('Failed to fetch dynamically imported module: /page.js');
        },
        ErrorBoundary: RouteErrorState,
      },
    ]);
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { level: 1 });

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
