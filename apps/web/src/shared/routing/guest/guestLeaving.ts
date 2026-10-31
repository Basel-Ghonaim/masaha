import { dropHeldIntent } from './heldIntent';

/** What each held action does when the guest who pressed it leaves its page: it lets itself go. */
const listeners = new Set<() => void>();

/** The last page the site's shell showed: where a guest's held action was pressed. */
let shown: string | null = null;

/**
 * Registers what to let go when a guest leaves the page they pressed a held action on (S14, #129's
 * review): a guest's favourite or report, held for their round trip through the sign-in.
 */
export function onGuestLeaving(letGo: () => void): void {
  listeners.add(letGo);
}

/**
 * The site's shell reports each page it shows: a guest landing on a page other than the last one —
 * the one they pressed on — lets every held action go, the one kept in the browser's storage too.
 * The sign-in and register pages are outside the site's shell, so going through them and back keeps
 * them.
 */
export function noteSitePage(pathname: string, guest: boolean): void {
  if (guest && shown !== null && shown !== pathname) {
    for (const letGo of listeners) letGo();
    dropHeldIntent();
  }
  shown = pathname;
}

/** The last page the site's shell showed, where a guest presses a held action; none before one. */
export function sitePage(): string | null {
  return shown;
}
