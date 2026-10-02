import { DirectionProvider } from '@shared/design-system';
import { directionOf, useLanguage } from '@shared/localisation';
import type { ReactNode } from 'react';

/** Every provider the app mounts around its routes, composed in one place. */
export function AppProviders({ children }: { children: ReactNode }) {
  // The direction follows the active language and is never chosen on its own
  // (docs/frontend/localisation.md).
  const direction = directionOf(useLanguage());

  return <DirectionProvider dir={direction}>{children}</DirectionProvider>;
}
