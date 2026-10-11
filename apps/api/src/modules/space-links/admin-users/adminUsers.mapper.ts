import type { AdminUserRow } from '@masaha/shared/space-links';

import type { SpaceRow } from '../../spaces/index.ts';
import type { AccountListing } from '../../users/index.ts';

/** One row of the admin's users list: the account, how it signs in, and the spaces it owns. */
export function toAdminUserRow(account: AccountListing, spaces: readonly SpaceRow[]): AdminUserRow {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    isSuspended: account.suspendedAt !== null,
    signIn: { password: account.hasPassword, google: account.hasGoogle },
    joinedAt: account.createdAt.toISOString(),
    spaces: spaces.map(({ id, nameEn, nameAr }) => ({ id, nameEn, nameAr })),
  };
}
