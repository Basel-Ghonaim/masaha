import type { StaffMember } from '@masaha/shared/space-links';

import type { StaffAccount } from '../../users/index.ts';
import type { ReceptionLink } from '../space-links.repository.ts';

/** A reception link and its account, as the owner's staff list shows them. */
export function toStaffMember(link: ReceptionLink, account: StaffAccount): StaffMember {
  const expiresAt = account.mustChangePassword ? account.temporaryPasswordExpiresAt : null;
  return {
    userId: account.id,
    name: account.name,
    email: account.email,
    isActive: link.deactivatedAt === null,
    temporaryPassword: expiresAt ? { expiresAt: expiresAt.toISOString() } : null,
  };
}
