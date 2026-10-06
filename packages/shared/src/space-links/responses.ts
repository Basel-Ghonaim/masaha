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
