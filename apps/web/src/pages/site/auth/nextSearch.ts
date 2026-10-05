/**
 * The page to return to after signing in, carried from one auth page to the other: `?next=…` when
 * the current page has one, else nothing. It is read back, and checked, by the landing rule (`landingPath`).
 */
export function nextSearch(search: string): string {
  const next = new URLSearchParams(search).get('next');
  return next === null ? '' : `?${new URLSearchParams({ next }).toString()}`;
}
