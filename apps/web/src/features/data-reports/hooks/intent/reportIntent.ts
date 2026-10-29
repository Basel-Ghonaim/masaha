import { onGuestLeaving } from '@shared/routing';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/** How long a held report waits for its sign-in: the round trip it serves, no more. */
export const HOLD_MS = 15 * 60 * 1000;

// A guest's report waiting for their sign-in (S14): in memory only, never in the address, so no link
// can open the dialog by itself; module-level, as the directory's near-me store, so it outlives the
// space's page while the guest signs in. A reload, or a recovery by email, loses it (finding 168). It
// is bound to its round trip: let go after `HOLD_MS`, or by the site's shell once the guest lands on
// another page, so a later visit signed in does not open the dialog by itself.
const store = createStore<{ held: string | null }>()(() => ({ held: null }));
let expiry: ReturnType<typeof setTimeout> | undefined;

function forget(): void {
  clearTimeout(expiry);
  expiry = undefined;
  store.setState({ held: null });
}

/** Holds the report a guest pressed on the space `slug`, until they come back signed in. */
export function holdReport(slug: string): void {
  forget();
  store.setState({ held: slug });
  expiry = setTimeout(forget, HOLD_MS);
}

/** Whether a report is held for `slug`: true once, the intent then cleared; another slug's is kept. */
export function takeReport(slug: string): boolean {
  if (store.getState().held !== slug) return false;
  forget();
  return true;
}

/** Lets go of a held report: the guest closed the sign-in, or went elsewhere, without going on. */
export function dropReport(): void {
  forget();
}

onGuestLeaving(dropReport);

/** The space whose report is held, if any; the component renders again when it changes. */
export function useHeldReport(): string | null {
  return useStore(store, (state) => state.held);
}
