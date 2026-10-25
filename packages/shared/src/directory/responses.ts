import type { AnnouncementType } from '../announcements/index.ts';
import type { AmenityIconKey } from '../lookups/index.ts';
import type { LiveStatus } from '../occupancy/index.ts';
import type {
  Contact,
  FactGroup,
  Location,
  OpeningRange,
  PhotoUrls,
  Price,
  SpaceHours,
} from '../spaces/index.ts';

// The public directory's answers (docs/api/api-contract.md §5, Directory (public)). Nothing here
// carries a capacity or a count (ADR 0008), nor a price but on a space's page; the card and the pin
// carry the live status.

/** A space's area, named in both languages; its governorate is the public catalogue's. */
export interface DirectoryArea {
  id: number;
  nameAr: string;
  nameEn: string;
}

/** A space as the directory's card shows it. */
export interface DirectorySpace {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  area: DirectoryArea;
  /** An active OWNER link (data-model › Derived values). */
  isVerified: boolean;
  /** The week, Sunday (0) to Saturday (6), `null` on a closed day; `null` while never saved. */
  days: (OpeningRange | null)[] | null;
  /** Straight-line, from the rounded point, to the nearest 100 m: only when sorted by distance. */
  distanceMeters?: number;
  /** The cover's card-size URL (its first photo), or `null`: the web then draws the space's mark. */
  cover: string | null;
  /** The live status now; `null` when the space has none (data-model › Live status). */
  liveStatus: LiveStatus | null;
}

/**
 * One of a user's favourites, with when it was saved: a publicly listed space as the directory's
 * card; one that left the directory (hidden, deleted, or in an area not listed) by its names only.
 */
export type FavoriteSpace =
  | { listed: true; savedAt: string; space: DirectorySpace }
  | {
      listed: false;
      savedAt: string;
      space: { id: number; nameEn: string; nameAr: string | null };
    };

/** A space on the map, with what its selected card shows. */
export interface MapPin {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  /** Named from the public catalogue. */
  areaId: number;
  location: Location;
  isVerified: boolean;
  days: (OpeningRange | null)[] | null;
  /** The cover's card-size URL, for the selected card, or `null`. */
  cover: string | null;
  /** The live status now; `null` when the space has none. */
  liveStatus: LiveStatus | null;
}

/** The map's pins: the whole filtered set, or its first `MAP_PINS_CEILING` by id, `truncated`. */
export interface MapPins {
  pins: MapPin[];
  truncated: boolean;
}

/** An amenity as a space's page lists it: the platform's, with its icon, or the space's own. */
export interface PublicAmenity {
  nameAr: string;
  nameEn: string | null;
  /** The platform's amenity's icon; `null` for the space's own. */
  icon: AmenityIconKey | null;
}

/** The most announcements a space's page carries. */
export const PUBLIC_ANNOUNCEMENTS_MAX = 20;

/** An announcement as a space's page shows it: running or upcoming; instants with their offset. */
export interface PublicAnnouncement {
  id: number;
  type: AnnouncementType;
  textAr: string;
  textEn: string | null;
  startsAt: string;
  endsAt: string | null;
}

/** A space's public page. */
export interface PublicSpace {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  area: DirectoryArea;
  addressAr: string;
  addressEn: string | null;
  landmarkAr: string | null;
  landmarkEn: string | null;
  location: Location;
  isVerified: boolean;
  /** `null` until first saved. */
  hours: SpaceHours | null;
  /** `null` when hidden: an unverified space's stale prices (data-model › Derived values). */
  prices: Price[] | null;
  /** The platform's active amenities in its order, then the space's own in theirs. */
  amenities: PublicAmenity[];
  contacts: Contact[];
  /** Each group's date, ISO 8601; `null` while the group is missing. */
  updatedAt: Record<FactGroup, string | null>;
  staleGroups: FactGroup[];
  /** Its photos in the gallery's order, the cover first, each in both sizes; none: a caption. */
  photos: PhotoUrls[];
  /** Its running and upcoming announcements, by start then id, at most `PUBLIC_ANNOUNCEMENTS_MAX`. */
  announcements: PublicAnnouncement[];
}
