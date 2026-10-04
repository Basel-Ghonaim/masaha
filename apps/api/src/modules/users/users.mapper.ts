import type { User } from '@masaha/shared/users';

import type { Account } from './users.repository.ts';

/** The account as the session shows it, before the caller adds the space links. */
export function toUserView(account: Account, hasPassword: boolean): User {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    language: account.language,
    mustChangePassword: account.mustChangePassword,
    hasPassword,
  };
}
