import type { SpaceNameView } from '@shared/lib';
import { onGuestLeaving } from '@shared/routing';

/** A favourite a guest pressed: the space, and its name as the card or the page showed it. */
export type HeldFavorite = { spaceId: number; name: SpaceNameView };

/** How long a held favourite waits for its sign-in: the round trip it serves, no more. */
export const HOLD_MS = 15 * 60 * 1000;

// A guest's favourite waiting for their sign-in (S14): in memory only, never in the address, so no
// link can save a space by itself; module-level, as the directory's near-me store, so it outlives the
// page while the guest signs in. A reload, or a recovery by email, loses it (finding 168). It is
// bound to its round trip: let go after `HOLD_MS`, or by the site's shell once the guest lands on
// another page, so a later sign-in in the tab, maybe someone else's, saves nothing.
let held: HeldFavorite | null = null;
let expiry: ReturnType<typeof setTimeout> | undefined;

function forget(): void {
  held = null;
  clearTimeout(expiry);
  expiry = undefined;
}

/** Holds the favourite a guest pressed, until they come back signed in or `HOLD_MS` has passed. */
export function holdFavorite(favorite: HeldFavorite): void {
  forget();
  held = favorite;
  expiry = setTimeout(forget, HOLD_MS);
}

/** The favourite held, once: it is cleared as it is taken. */
export function takeFavorite(): HeldFavorite | null {
  const taken = held;
  forget();
  return taken;
}

/** Lets go of a held favourite: the guest closed the sign-in, or went elsewhere, without going on. */
export function dropFavorite(): void {
  forget();
}

onGuestLeaving(dropFavorite);
