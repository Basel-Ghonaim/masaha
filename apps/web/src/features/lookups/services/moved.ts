/** Which way a row moves in its list: towards its start (`up`) or its end (`down`). */
export type Direction = 'up' | 'down';

/**
 * A list's ids once `id` has moved one step `direction`: it trades places with its neighbour. An id
 * not in the list, or one already at the end it moves towards, leaves the order as it was.
 */
export function moved(ids: readonly number[], id: number, direction: Direction): number[] {
  const order = [...ids];
  const from = order.indexOf(id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) return order;
  order.splice(from, 1);
  order.splice(to, 0, id);
  return order;
}
