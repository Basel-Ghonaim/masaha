import { useCopy } from '@shared/copy';
import { DirectionProvider, Toaster } from '@shared/design-system';
import { directionOf, useLanguage } from '@shared/localisation';
import { useActionBarShown } from '@shared/routing';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Every provider the app mounts around its routes, composed in one place. The QueryClient is handed in:
 * the app makes its one client at bootstrap, outside React. The one Toaster sits here, beside the
 * routes, so a toast raised as a sign-in lands outlives the change of shell that follows it; while a
 * page shows a bottom action bar, the toasts sit above it.
 */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  const copy = useCopy();
  // The direction follows the active language and is never chosen on its own
  // (docs/frontend/localisation.md).
  const direction = directionOf(useLanguage());
  // Above the bar: its 48 px button and its padding, with a gap (P8).
  const raised = useActionBarShown() ? { bottom: '5.5rem' } : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir={direction}>
        {children}
        <Toaster
          label={copy.status.toasts.label}
          closeLabel={copy.status.toasts.close}
          position="bottom-center"
          offset={raised}
          mobileOffset={raised}
        />
      </DirectionProvider>
    </QueryClientProvider>
  );
}
