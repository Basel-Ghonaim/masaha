import type { MyAccount, User } from '@masaha/shared/users';

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

/** How an account signs in: with a password, with Google, or both. */
export interface SignInMethods {
  hasPassword: boolean;
  hasGoogle: boolean;
}

/** The account as its own settings read it, with how it signs in. */
export function toMyAccount(
  { id, name, email, language, role }: Account,
  { hasPassword, hasGoogle }: SignInMethods,
): MyAccount {
  return { id, name, email, language, role, hasPassword, hasGoogle };
}
