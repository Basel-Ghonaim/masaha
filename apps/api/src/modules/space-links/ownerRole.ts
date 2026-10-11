import type { Role } from '../../generated/prisma/enums.ts';

/**
 * The global role a person's owner links give them (ADR 0009): `OWNER` while they hold an active
 * OWNER link, `USER` once they hold none. An admin is never linked, so never changed. The new role,
 * or `null` when it stays as it is.
 */
export function ownerRoleFor(role: Role, activeOwnerLinks: number): Role | null {
  if (role === 'ADMIN') return null;
  const next: Role = activeOwnerLinks > 0 ? 'OWNER' : 'USER';
  return next === role ? null : next;
}
