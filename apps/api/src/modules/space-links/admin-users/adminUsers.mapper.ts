import type { AdminUserRow } from '@masaha/shared/space-links';

import type { SpaceRow } from '../../spaces/index.ts';
import type { AccountListing } from '../../users/index.ts';

const summary = ({ id, nameEn, nameAr }: SpaceRow) => ({ id, nameEn, nameAr });

/**
 * One row of the admin's users list: the account, how it signs in, the spaces it owns and those
 * at whose desk it works.
 */
export function toAdminUserRow(
  account: AccountListing,
  owned: readonly SpaceRow[],
  reception: readonly SpaceRow[],
): AdminUserRow {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    isSuspended: account.suspendedAt !== null,
    signIn: { password: account.hasPassword, google: account.hasGoogle },
    joinedAt: account.createdAt.toISOString(),
    spaces: owned.map(summary),
    receptionSpaces: reception.map(summary),
  };
}
