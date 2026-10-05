import { AppError } from '../../shared/errors/index.ts';

/** A row of an ordered list: its id and its place. */
export interface Placed {
  id: number;
  sortOrder: number;
}

/**
 * The places a new order gives the list's rows, for the rows whose place changes. The new order must
 * name exactly the list's current rows, each once: a missing, extra or repeated id means the list
 * changed since the admin saw it, a `conflict` (decision L3).
 */
export function exactOrder(current: readonly Placed[], ids: readonly number[]): Placed[] {
  const placeOf = new Map(current.map(({ id, sortOrder }) => [id, sortOrder]));
  const exact =
    ids.length === current.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => placeOf.has(id));
  if (!exact) throw AppError.conflict(undefined, 'The order does not name the current list');

  return ids
    .map((id, sortOrder) => ({ id, sortOrder }))
    .filter(({ id, sortOrder }) => placeOf.get(id) !== sortOrder);
}
