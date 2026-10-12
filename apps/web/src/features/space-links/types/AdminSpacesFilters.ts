import type { ListStatus } from '../services/filtersOf';
import type { PlaceFilter } from './PlaceFilter';

/** The admin's spaces list's filters and page, as the address keeps them. */
export type AdminSpacesFilters = {
  /** Part of a name, already trimmed. */
  q?: string;
  status?: ListStatus;
  place: PlaceFilter;
  stale: boolean;
  page: number;
};
