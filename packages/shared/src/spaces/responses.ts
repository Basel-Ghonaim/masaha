import type { FactGroup } from './factGroups.ts';
import type { Location } from './gazaStrip.ts';

// The admin's spaces (docs/api/api-contract.md §5, Spaces (the admin)).

/** A day's opening range, in minutes after midnight (Asia/Gaza); 0–1440 is around the clock. */
export interface OpeningRange {
  opensMinute: number;
  closesMinute: number;
}

/** A named shift inside the opening hours, in minutes after midnight. */
export interface Shift {
  id: number;
  nameAr: string;
  nameEn: string | null;
  startsMinute: number;
  endsMinute: number;
}

/** The opening hours with the shifts, as they are saved together. */
export interface SpaceHours {
  /** Sunday (0) to Saturday (6); `null` when the space is closed that day. */
  days: (OpeningRange | null)[];
  /** In the order they are shown in. */
  shifts: Shift[];
}

/** A space as the admin sees and edits it. */
export interface AdminSpace {
  id: number;
  /** Derived from the English name when the space was created; never changes. */
  slug: string;
  nameEn: string;
  nameAr: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  areaId: number;
  addressAr: string;
  addressEn: string | null;
  landmarkAr: string | null;
  landmarkEn: string | null;
  location: Location;
  /** Hidden from the public by the admin. */
  isHidden: boolean;
  /** An owner has joined: the owner edits its profile and facts, and the admin no longer does. */
  isVerified: boolean;
  /**
   * When each fact group was last saved or confirmed (ISO 8601); null while it has never been saved
   * (the profile always has a date).
   */
  updatedAt: Record<FactGroup, string | null>;
  /** The groups older than the platform's thresholds, in the order of `FACT_GROUPS`. */
  staleGroups: FactGroup[];
  /** The groups never saved, in the order of `FACT_GROUPS`. */
  missingGroups: FactGroup[];
  /** The opening hours and the shifts; null until they are first saved. */
  hours: SpaceHours | null;
}
