import { AppError } from '../errors/index.ts';

// The largest id an Int column holds (PostgreSQL's integer).
const MAX_ID = 2_147_483_647;

/**
 * The id a path parameter names, as a number: a positive integer written in plain decimal.
 * Anything else names no row, so it is a `not_found`, as an unknown id is.
 */
export function parseId(value: unknown): number {
  const id = typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : NaN;
  if (!(id <= MAX_ID)) throw AppError.notFound();
  return id;
}
