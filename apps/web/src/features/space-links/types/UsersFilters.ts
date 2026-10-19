import type { ACCOUNT_STATES } from '@masaha/shared/space-links';
import type { AdminUsersRequest } from './AdminUsersRequest';

/** Whether an account may sign in, as the users list filters by it. */
export type AccountState = (typeof ACCOUNT_STATES)[number];

/** A global role, as the users list filters by it: `user`, `owner` or `admin`. */
export type UserRoleFilter = NonNullable<AdminUsersRequest['role']>;

/** The users list's filters and page, as the address keeps them; a filter not there is not applied. */
export type UsersFilters = {
  q?: string;
  role?: UserRoleFilter;
  state?: AccountState;
  page: number;
};
