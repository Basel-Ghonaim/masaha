import type { MyAccount } from '@masaha/shared/users';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { createUsersRepository } from '../../repository/usersRepository';

const repository = createUsersRepository();

/** The key of one's own account, under the session's scope (docs/frontend/architecture.md §7). */
export const MY_ACCOUNT_KEY = ['me', 'account'] as const;

/** The signed-in user's own account (`GET /me`), as the settings read and edit it. */
export function useMyAccountQuery() {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<MyAccount, AppError>({ queryKey: MY_ACCOUNT_KEY, queryFn: repository.me });
}
