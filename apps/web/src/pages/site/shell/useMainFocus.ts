import { useEffect, useRef } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

/**
 * Moves the focus to the page's `main` when another page opens, so the keyboard does not stay on a
 * link the page change removed, also when the shell itself opens by a navigation (as from the
 * focus shell, once signed in). Not on the first load or a reload, and not when only the search or
 * the hash changes; the scroll is left to `ScrollRestoration`.
 */
export function useMainFocus(): void {
  const { pathname } = useLocation();
  const arrival = useNavigationType();
  // The path the focus was last placed for: on a load (a pop), the one loaded, so it is left where it
  // is; none when a navigation opened the shell, so its first page takes the focus.
  const placed = useRef(arrival === NavigationType.Pop ? pathname : null);

  useEffect(() => {
    if (placed.current === pathname) return;
    placed.current = pathname;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
}
