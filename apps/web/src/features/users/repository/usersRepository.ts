import type { ChangePasswordRequest, PasswordChanged } from '@masaha/shared/users';
import { api } from '@shared/api';

/** The users capability's server calls: the signed-in user's own account (docs/api/api-contract.md §5 › Me). */
export interface UsersRepository {
  /** Sets a new password; the session goes on with the access token it answers. */
  changePassword: (request: ChangePasswordRequest) => Promise<PasswordChanged>;
}

/** The users capability's calls, through the app's one client. */
export function createUsersRepository(): UsersRepository {
  return {
    changePassword: (request) => api.post<PasswordChanged>('/me/password', request),
  };
}
