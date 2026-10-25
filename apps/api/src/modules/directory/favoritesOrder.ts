/**
 * The order of a user's favourites, by space id. `saved` comes newest saved first; without a point
 * that is the order. From a point, `nearest` holds the listed ones nearest first, as the listing
 * ordered them, and those that left the directory follow, newest saved first.
 */
export function favoritesOrder(
  saved: readonly number[],
  nearest: readonly number[] | null,
): number[] {
  if (nearest === null) return [...saved];
  const listed = new Set(nearest);
  return [...nearest, ...saved.filter((id) => !listed.has(id))];
}
