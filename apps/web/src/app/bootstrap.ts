import { createQueryClient, setupApiClient, type QueryClient } from '@shared/api';
import { CATALOGUES } from '@shared/copy';
import { setupLocalisation } from '@shared/localisation';
import { preferencesLanguage, setupPreferences } from '@shared/preferences';
import { getSession, refreshSession, restoreSession } from '@shared/session';
import { connectSession } from './session';

/** Wires the platform before the first render, and returns what the app renders with. */
export function bootstrap(): { queryClient: QueryClient } {
  // The preferences start from what the pre-paint script resolved, and are the language's source
  // from then on (docs/frontend/localisation.md#mechanism).
  setupPreferences();
  setupLocalisation({ catalogues: CATALOGUES, language: preferencesLanguage });
  // The transport never imports the session: the token getter and the refresh are handed in here.
  setupApiClient({ getAccessToken: () => getSession().accessToken, refresh: refreshSession });
  // The app's one QueryClient, made here, outside React, so the composition root holds it.
  const queryClient = createQueryClient();
  connectSession(queryClient);
  // Not awaited: public pages render at once, and only the guards wait for the restore.
  void restoreSession();
  return { queryClient };
}
