import type { SpaceState } from '@masaha/shared/space-links';
import type { PlaceFilter } from './PlaceFilter';

/** The admin's spaces list's filters and page, as the address keeps them. */
export type AdminSpacesFilters = {
  /** Part of a name, already trimmed. */
  q?: string;
  status?: SpaceState;
  place: PlaceFilter;
  stale: boolean;
  page: number;
};
