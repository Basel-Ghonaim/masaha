import { api } from '@shared/api';
import type { Session } from '../model';

/**
 * The session's own calls (docs/api/api-contract.md §5 › Session). Sign-in, registration and Google
 * are features/auth's: they hand their answer to establishSession.
 */
export interface SessionRepository {
  /** Renews the session from the refresh cookie. */
  refresh: () => Promise<Session>;
  /** Ends this device's session on the server. */
  logout: () => Promise<void>;
}

/** The session's calls, through the app's one client. */
export function createSessionRepository(): SessionRepository {
  return {
    refresh: () => api.post<Session>('/auth/refresh'),
    logout: async () => {
      await api.post<undefined>('/auth/logout');
    },
  };
}
