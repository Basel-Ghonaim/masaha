import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Moves the focus to the page's `main` when another page opens, so the keyboard does not stay on a
 * link the page change removed. Not on the first load, and not when only the search or the hash
 * changes; the scroll is left to `ScrollRestoration`.
 */
export function useMainFocus(): void {
  const { pathname } = useLocation();
  // The path the focus was last placed for; the first load's, so it is left where it is.
  const placed = useRef(pathname);

  useEffect(() => {
    if (placed.current === pathname) return;
    placed.current = pathname;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
}
