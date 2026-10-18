import { adminUsersQuerySchema } from '@masaha/shared/space-links';
import type { AdminUsersRequest } from '../types/AdminUsersRequest';
import type { UsersFilters } from '../types/UsersFilters';

/** One of the contract's rules for a query parameter. */
type Rule<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

const RULES = adminUsersQuerySchema.shape;

/** A parameter read by the contract's own rule: missing or invalid, it is not there. */
function read<T>(rule: Rule<T>, value: string | null): T | undefined {
  if (value === null) return undefined;
  const result = rule.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * The users list's filters and page from the address (`?q=&state=&page=`), each read by the rule the
 * server applies, so a value the server would refuse falls back to its default.
 */
export function usersFiltersOf(params: URLSearchParams): UsersFilters {
  const q = read(RULES.q, params.get('q'));
  const state = read(RULES.state, params.get('state'));

  return {
    ...(q !== undefined && { q }),
    ...(state !== undefined && { state }),
    page: read(RULES.page, params.get('page')) ?? 1,
  };
}

/** The address of the filters and page, the defaults left out. */
export function usersParamsOf({ q, state, page }: UsersFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (q !== undefined) params.set('q', q);
  if (state !== undefined) params.set('state', state);
  if (page !== 1) params.set('page', String(page));
  return params;
}

/** The request the filters and page make, named as the contract names them. */
export function usersRequestOf({ q, state, page }: UsersFilters): AdminUsersRequest {
  return {
    ...(q !== undefined && { q }),
    ...(state !== undefined && { state }),
    page,
  };
}
