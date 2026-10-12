import type { FactGroup } from '../spaces/index.ts';
import type { Role } from '../users/index.ts';

/** One of the user's active links to a space, and their role there (ADR 0009). */
export interface SessionSpaceLink {
  spaceId: number;
  role: 'OWNER' | 'RECEPTION';
}

/** A space the caller holds an active link to, with their role there (GET /manage/spaces). */
export interface ManagedSpace extends SessionSpaceLink {
  slug: string;
  /** A space's English name is required, its Arabic name optional (docs/architecture/data-model.md). */
  nameAr: string | null;
  nameEn: string;
  /** The space's area; a lookup has both names. */
  area: { nameAr: string; nameEn: string };
}

/** One row of the admin's spaces list (GET /admin/spaces). */
export interface AdminSpaceRow {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  area: { id: number; nameAr: string; nameEn: string };
  /** While an owner is linked (an active OWNER link). */
  isVerified: boolean;
  isHidden: boolean;
  /** When it was soft-deleted (ISO 8601), or `null` for a live space. */
  deletedAt: string | null;
  /** Its active owners, oldest link first, a deleted space's included. */
  owners: { id: number; name: string }[];
  /** The fact groups older than the platform's thresholds. */
  staleGroups: FactGroup[];
  /** The fact groups never saved. */
  missingGroups: FactGroup[];
  /** The latest of its fact groups' dates (ISO 8601). */
  lastUpdatedAt: string;
}

/** An owner added (POST /admin/owners). */
export interface AddedOwner {
  userId: number;
  /** The new account's temporary password, shown once; `null` for an account upgraded. */
  temporaryPassword: string | null;
}

/** One row of the admin's users list (GET /admin/users). */
export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  /** The global role; `OWNER` follows the person's active owner links (ADR 0009). */
  role: Role;
  isSuspended: boolean;
  /** How the account signs in: a password, Google, or both. */
  signIn: { password: boolean; google: boolean };
  /** When the account was created (ISO 8601). */
  joinedAt: string;
  /** The spaces of its active owner links, oldest first; a soft-deleted space's is left out. */
  spaces: { id: number; nameEn: string; nameAr: string | null }[];
}
