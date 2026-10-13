import { createQueryClient } from '@shared/api';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/**
 * Renders a hook that needs a data router (such as one that blocks navigation) at `path`, beside
 * another page, `/elsewhere`, with the app's QueryClient. `result.current` holds its latest answer.
 */
export function renderHookInRouter<Result>(
  hook: () => Result,
  { path = '/page', client = createQueryClient() }: { path?: string; client?: QueryClient } = {},
) {
  const result = { current: undefined as Result };
  function Probe() {
    result.current = hook();
    return null;
  }
  const router = createMemoryRouter(
    [
      { path, element: <Probe /> },
      { path: '/elsewhere', element: <p>Elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { result, router, client };
}
