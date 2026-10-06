import type { FactGroup } from '../spaces/index.ts';
import type { SPACE_STATES } from './requests.ts';

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

/** A space's state in the admin's list (`SPACE_STATES`). */
export type SpaceState = (typeof SPACE_STATES)[number];

/** One row of the admin's spaces list (GET /admin/spaces). */
export interface AdminSpaceRow {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  area: { id: number; nameAr: string; nameEn: string };
  /** `hidden` whatever its owners; else `verified` while an owner is linked. */
  state: SpaceState;
  /** Its active owners, oldest link first. */
  owners: { id: number; name: string }[];
  /** The fact groups older than the platform's thresholds. */
  staleGroups: FactGroup[];
  /** The latest of its fact groups' dates (ISO 8601). */
  lastUpdatedAt: string;
}
