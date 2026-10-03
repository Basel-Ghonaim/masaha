import type { QueryClient } from '@shared/api';
import { RouterProvider } from 'react-router';
import { AppProviders } from './providers';
import { router } from './router';

export function App({ queryClient }: { queryClient: QueryClient }) {
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
