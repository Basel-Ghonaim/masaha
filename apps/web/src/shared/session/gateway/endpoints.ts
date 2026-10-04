import { api, type Api } from '@shared/api';
import type { Session } from '../model';

/**
 * The session's own calls (docs/api/api-contract.md §5 › Session). Sign-in, registration and Google
 * are features/auth's: they hand their answer to establishSession.
 */
export interface SessionEndpoints {
  /** Renews the session from the refresh cookie. */
  refresh: () => Promise<Session>;
  /** Ends this device's session on the server. */
  logout: () => Promise<void>;
}

export function createSessionEndpoints(client: Api = api): SessionEndpoints {
  return {
    refresh: () => client.post<Session>('/auth/refresh'),
    logout: async () => {
      await client.post<undefined>('/auth/logout');
    },
  };
}
