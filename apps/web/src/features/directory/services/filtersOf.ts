import { DIRECTORY_AREAS_MAX, directoryQuerySchema } from '@masaha/shared/directory';
import { PRICE_PERIODS } from '@masaha/shared/spaces';
import type { DirectoryFilters, DirectoryOrder } from '../types/DirectoryFilters';
import { MAX_SHEKELS } from './priceBounds';

// The address's keys (S5): q, area, period, min, max, available, verified, students, friday, sort,
// page. The budget is in whole shekels, named min and max; the request sends agorot.

const ORDERS: readonly DirectoryOrder[] = ['updated', 'name', 'relevance'];
/** The period the budget applies to when the address names none. */
export const DEFAULT_PERIOD = 'DAY';
const MAX_ID = 2_147_483_647;
const WHOLE = /^[1-9]\d*$/;

/** A whole number from 1 up to `high`, or none. */
function wholeIn(text: string | null, high: number): number | undefined {
  if (text === null || !WHOLE.test(text)) return undefined;
  const value = Number(text);
  return value <= high ? value : undefined;
}

/** `3,7`: distinct area ids, at most 50; anything else, none. */
function areasOf(text: string | null): number[] {
  if (text === null) return [];
  const ids = text.split(',').map((part) => wholeIn(part, MAX_ID));
  if (ids.some((id) => id === undefined)) return [];
  const distinct = [...new Set(ids as number[])];
  return distinct.length <= DIRECTORY_AREAS_MAX ? distinct : [];
}

/**
 * The search a field's text makes, read by the server's rule: trimmed, none when empty; a text with
 * no letter to match (tashkeel or tatweel only) is refused, kept off the request and said.
 */
export function searchOf(text: string): { q: string | undefined; refused: boolean } {
  if (text.trim() === '') return { q: undefined, refused: false };
  const result = directoryQuerySchema.safeParse({ q: text });
  return result.success ? { q: result.data.q, refused: false } : { q: undefined, refused: true };
}

/**
 * The directory's filters, order and page from the address; a value the server would refuse falls
 * back to its default and never reaches the request.
 */
export function filtersOf(params: URLSearchParams): DirectoryFilters {
  const { q } = searchOf(params.get('q') ?? '');
  const period = PRICE_PERIODS.find((value) => value === params.get('period'));
  const sort = ORDERS.find((value) => value === params.get('sort'));
  const flag = (key: string) => params.get(key) === '1';
  const min = wholeIn(params.get('min'), MAX_SHEKELS);
  const max = wholeIn(params.get('max'), MAX_SHEKELS);
  return {
    q,
    areas: areasOf(params.get('area')),
    period: period ?? DEFAULT_PERIOD,
    min,
    // A maximum under the minimum is refused by the server; it is left out, the minimum kept.
    max: min !== undefined && max !== undefined && max < min ? undefined : max,
    availableNow: flag('available'),
    verified: flag('verified'),
    studentPrices: flag('students'),
    openFriday: flag('friday'),
    // Best match is the server's order for a search, and refused without one.
    sort: sort === 'relevance' && q === undefined ? undefined : sort,
    page: wholeIn(params.get('page'), Number.MAX_SAFE_INTEGER) ?? 1,
  };
}

/**
 * The address of the filters, order and page, no default written: the period only with a bound,
 * the page from 2, the order only when it differs from the one the search gives.
 */
export function paramsOf(filters: DirectoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q !== undefined) params.set('q', filters.q);
  if (filters.areas.length > 0) params.set('area', filters.areas.join(','));
  if (filters.min !== undefined || filters.max !== undefined) params.set('period', filters.period);
  if (filters.min !== undefined) params.set('min', String(filters.min));
  if (filters.max !== undefined) params.set('max', String(filters.max));
  if (filters.availableNow) params.set('available', '1');
  if (filters.verified) params.set('verified', '1');
  if (filters.studentPrices) params.set('students', '1');
  if (filters.openFriday) params.set('friday', '1');
  const defaultOrder = filters.q === undefined ? 'updated' : 'relevance';
  if (filters.sort !== undefined && filters.sort !== defaultOrder) params.set('sort', filters.sort);
  if (filters.page !== 1) params.set('page', String(filters.page));
  return params;
}
