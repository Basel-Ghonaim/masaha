import { createQueryClient, setupApiClient, type QueryClient } from '@shared/api';
import { CATALOGUES } from '@shared/copy';
import { setupLocalisation } from '@shared/localisation';
import { preferencesLanguage, setupPreferences } from '@shared/preferences';

/** Wires the platform before the first render, and returns what the app renders with. */
export function bootstrap(): { queryClient: QueryClient } {
  // The preferences start from what the pre-paint script resolved, and are the language's source
  // from then on (docs/frontend/localisation.md#mechanism).
  setupPreferences();
  setupLocalisation({ catalogues: CATALOGUES, language: preferencesLanguage });
  // The transport never imports the session: the token getter and the refresh are handed in here.
  // Without a session there is no token to send, and nothing to refresh.
  setupApiClient({ getAccessToken: () => null });
  // The app's one QueryClient, made here, outside React, so the composition root holds it.
  return { queryClient: createQueryClient() };
}
