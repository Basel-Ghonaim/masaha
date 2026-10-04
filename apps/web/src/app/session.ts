import type { QueryClient } from '@shared/api';
import { setLanguage } from '@shared/preferences';
import { onSessionEnded, onSessionEstablished } from '@shared/session';

/**
 * Connects the session to the rest of the platform, which it never imports (docs/frontend/
 * architecture.md §4):
 * - a session that ends takes its cached server state with it, so the next user never sees it;
 * - a sign-in makes the account's language the interface's. A restore or a refresh never does: the
 *   user's later choice on this device wins.
 */
export function connectSession(queryClient: QueryClient): void {
  onSessionEnded(() => {
    queryClient.clear();
  });
  onSessionEstablished((session, { source }) => {
    if (source === 'signIn') setLanguage(session.user.language);
  });
}
