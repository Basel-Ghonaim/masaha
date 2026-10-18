import type { ACCOUNT_STATES } from '@masaha/shared/space-links';

/** Whether an account may sign in, as the users list filters by it. */
export type AccountState = (typeof ACCOUNT_STATES)[number];

/** The users list's filters and page, as the address keeps them; a filter not there is not applied. */
export type UsersFilters = {
  q?: string;
  state?: AccountState;
  page: number;
};
