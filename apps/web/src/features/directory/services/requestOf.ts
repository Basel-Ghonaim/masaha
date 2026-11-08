import type { Language } from '@shared/copy';
import type { MapBounds } from '@shared/map';
import type { DirectoryFilters } from '../types/DirectoryFilters';
import type { DirectoryRequest } from '../types/DirectoryRequest';
import type { PinsRequest } from '../types/PinsRequest';
import { boundsText } from './boundsText';

/**
 * The directory's page: 18 cards fill one, two or three columns alike, and weigh less on a weak
 * connection than the contract's default of 20.
 */
const DIRECTORY_PAGE_SIZE = 18;

/** The filters as the list and the map send them alike: what is left out is the server's default. */
function filtersRequestOf(filters: DirectoryFilters): Omit<PinsRequest, 'bounds'> {
  const { period } = filters;
  return {
    ...(filters.q !== undefined && { q: filters.q }),
    ...(filters.areas.length > 0 && { area: filters.areas.join(',') }),
    // The subscription filters alone; its bounds only with it.
    ...(period !== undefined && { period }),
    ...(period !== undefined && filters.min !== undefined && { priceMin: filters.min * 100 }),
    ...(period !== undefined && filters.max !== undefined && { priceMax: filters.max * 100 }),
    ...(filters.studentPrices && { studentPrices: true }),
    ...(filters.openFriday && { openFriday: true }),
    ...(filters.verified && { verified: true }),
    ...(filters.openNow && { openNow: true }),
    ...(filters.evening && { evening: true }),
  };
}

/**
 * The request the filters, order and page make, named as the contract names them: the subscription,
 * with its budget in agorot, only the flags that hold, the language only to order by name, the page
 * from 2. What is left out is the server's default. Ordered by distance (near me), the order is
 * `distance` whatever the address holds, with no language; the point travels apart, in its header.
 */
export function requestOf(
  filters: DirectoryFilters,
  language: Language,
  { byDistance = false }: { byDistance?: boolean } = {},
): DirectoryRequest {
  const sort = byDistance ? 'distance' : filters.sort;
  return {
    limit: DIRECTORY_PAGE_SIZE,
    ...filtersRequestOf(filters),
    ...(sort !== undefined && { sort }),
    ...(sort === 'name' && { lang: language }),
    ...(filters.page !== 1 && { page: filters.page }),
  };
}

/**
 * The map's request: the list's filters, the whole set, within the box in view once the map asks
 * within it (past the pins' ceiling).
 */
export function pinsRequestOf(filters: DirectoryFilters, inView: MapBounds | null): PinsRequest {
  return { ...filtersRequestOf(filters), ...(inView !== null && { bounds: boundsText(inView) }) };
}
