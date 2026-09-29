import { DirectionProvider } from '@shared/design-system';
import { directionOf, useLanguage } from '@shared/localisation';
import { RouterProvider } from 'react-router';
import { router } from './router';

export function App() {
  // The direction follows the active language and is never chosen on its own
  // (docs/frontend/localisation.md).
  const direction = directionOf(useLanguage());

  return (
    <DirectionProvider dir={direction}>
      <RouterProvider router={router} />
    </DirectionProvider>
  );
}
