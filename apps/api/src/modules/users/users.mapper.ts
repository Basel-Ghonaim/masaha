import type { SessionUser } from '@masaha/shared';

import type { Account } from './users.repository.ts';

/** The account as the session shows it, before the caller adds the space links. */
export type UserView = Omit<SessionUser, 'spaces'>;

export function toUserView(account: Account, hasPassword: boolean): UserView {
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
