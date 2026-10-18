import type { ChangePasswordRequest, HandoverRequest, PasswordChanged } from '@masaha/shared/users';
import { api } from '@shared/api';

/** The users capability's server calls: the signed-in user's own account and the admin's one-time password (docs/api/api-contract.md §5). */
export interface UsersRepository {
  /** Sets a new password; the session goes on with the access token it answers. */
  changePassword: (request: ChangePasswordRequest) => Promise<PasswordChanged>;
  /** Records how the temporary password just shown reached its person, while it is still pending. */
  handOver: (userId: number, request: HandoverRequest) => Promise<undefined>;
}

/** The users capability's calls, through the app's one client. */
export function createUsersRepository(): UsersRepository {
  return {
    changePassword: (request) => api.post<PasswordChanged>('/me/password', request),
    handOver: (userId, request) =>
      api.post<undefined>(`/admin/users/${String(userId)}/temporary-password/handover`, request),
  };
}
