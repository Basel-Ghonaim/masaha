import { DirectionProvider } from '@shared/design-system';
import { directionOf, useLanguage } from '@shared/localisation';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Every provider the app mounts around its routes, composed in one place. The QueryClient is handed in:
 * the app makes its one client at bootstrap, outside React.
 */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  // The direction follows the active language and is never chosen on its own
  // (docs/frontend/localisation.md).
  const direction = directionOf(useLanguage());

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir={direction}>{children}</DirectionProvider>
    </QueryClientProvider>
  );
}
