import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';
import type { Language } from '@shared/copy';
import type { DirectoryFilters } from '../types/DirectoryFilters';
import type { DirectoryRequest } from '../types/DirectoryRequest';

/**
 * The request the filters, order and page make, named as the contract names them: the budget in
 * agorot with its period, only the flags that hold, the language only to order by name, the page
 * from 2. What is left out is the server's default.
 */
export function requestOf(filters: DirectoryFilters, language: Language): DirectoryRequest {
  const bounded = filters.min !== undefined || filters.max !== undefined;
  return {
    limit: DEFAULT_PAGE_SIZE,
    ...(filters.q !== undefined && { q: filters.q }),
    ...(filters.areas.length > 0 && { area: filters.areas.join(',') }),
    ...(bounded && { period: filters.period }),
    ...(filters.min !== undefined && { priceMin: filters.min * 100 }),
    ...(filters.max !== undefined && { priceMax: filters.max * 100 }),
    ...(filters.studentPrices && { studentPrices: true }),
    ...(filters.openFriday && { openFriday: true }),
    ...(filters.verified && { verified: true }),
    ...(filters.availableNow && { availableNow: true }),
    ...(filters.sort !== undefined && { sort: filters.sort }),
    ...(filters.sort === 'name' && { lang: language }),
    ...(filters.page !== 1 && { page: filters.page }),
  };
}
