import { adminSpacesQuerySchema } from '@masaha/shared/space-links';
import type { AdminSpacesFilters } from '../types/AdminSpacesFilters';
import type { AdminSpacesRequest } from '../types/AdminSpacesRequest';

/** One of the contract's rules for a query parameter. */
type Rule<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const RULES = adminSpacesQuerySchema.shape;

/** A parameter read by the contract's own rule: missing or invalid, it is not there. */
function read<T>(rule: Rule<T>, value: string | null): T | undefined {
  if (value === null) return undefined;
  const result = rule.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * The list's filters and page from the address (`?q=&status=&governorate=&area=&stale=true&page=`),
 * each read by the rule the server applies, so a value the server would refuse falls back to its
 * default. An area names one place more precisely than its governorate, so it wins over one.
 */
export function filtersOf(params: URLSearchParams): AdminSpacesFilters {
  const areaId = read(RULES.areaId, params.get('area'));
  const governorateId = read(RULES.governorateId, params.get('governorate'));
  const q = read(RULES.q, params.get('q'));
  const status = read(RULES.status, params.get('status'));

  return {
    ...(q !== undefined && { q }),
    ...(status !== undefined && { status }),
    place:
      areaId !== undefined ? { areaId } : governorateId !== undefined ? { governorateId } : null,
    stale: read(RULES.stale, params.get('stale')) === true,
    page: read(RULES.page, params.get('page')) ?? 1,
  };
}

/** The address of the filters and page, the defaults left out. */
export function paramsOf({ q, status, place, stale, page }: AdminSpacesFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (q !== undefined) params.set('q', q);
  if (status !== undefined) params.set('status', status);
  if (place !== null) {
    if ('areaId' in place) params.set('area', String(place.areaId));
    else params.set('governorate', String(place.governorateId));
  }
  if (stale) params.set('stale', 'true');
  if (page !== 1) params.set('page', String(page));
  return params;
}

/** The request the filters and page make, named as the contract names them. */
export function requestOf({
  q,
  status,
  place,
  stale,
  page,
}: AdminSpacesFilters): AdminSpacesRequest {
  return {
    ...(q !== undefined && { q }),
    ...(status !== undefined && { status }),
    ...place,
    ...(stale && { stale: true }),
    page,
  };
}
