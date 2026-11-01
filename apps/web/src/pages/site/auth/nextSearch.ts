import { returnUrlOf } from '@shared/routing';

/**
 * The page to return to after signing in, carried from one auth page to the other — sign in,
 * registration, the forgotten password and the reset link: `?next=…` when the current page has one
 * on the site (`returnUrlOf`, never raw input), else nothing. It is read back, and checked again, by
 * the landing rule (`landingPath`).
 */
export function nextSearch(search: string): string {
  const next = returnUrlOf(search);
  return next === undefined ? '' : `?${new URLSearchParams({ next }).toString()}`;
}
