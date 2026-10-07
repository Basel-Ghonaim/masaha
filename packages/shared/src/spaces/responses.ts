import type { FactGroup } from './factGroups.ts';
import type { Location } from './gazaStrip.ts';

// The admin's spaces (docs/api/api-contract.md §5, Spaces (the admin)).

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
}
