import { DirectionProvider } from '@shared/design-system';
import { RouterProvider } from 'react-router';
import { router } from './router';

export function App() {
  // The pre-paint script in index.html has already resolved the language, and the direction with
  // it, onto <html> (docs/frontend/localisation.md#mechanism).
  const direction = document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';

  return (
    <DirectionProvider dir={direction}>
      <RouterProvider router={router} />
    </DirectionProvider>
  );
}
