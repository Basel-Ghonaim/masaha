import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext, useLocation, useNavigationType } from 'react-router';
import { isFirstPage } from './firstPage';

/** What takes the focus by itself: a control, a link, or an element given a `tabindex`. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

/**
 * Where the focus goes for a location's hash, if the page holds the element it names: the element
 * itself when it takes the focus, else its first focusable heading (a card named by the hash, whose
 * heading carries `tabIndex={-1}`); none when neither does.
 */
function namedBy(hash: string): HTMLElement | null {
  if (hash.length < 2) return null;
  let named: HTMLElement | null;
  try {
    named = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
  if (named === null || named.matches(FOCUSABLE)) return named;
  return named.querySelector<HTMLElement>(
    ':is(h1, h2, h3, h4, h5, h6)[tabindex], [role="heading"][tabindex]',
  );
}

/**
 * Where the focus goes when the page changes, in every shell (130, SH-018): the document's first page
 * keeps it where the browser leaves it, however it arrived (a guard's replace on load included);
 * after it, every change of path moves it to the page's `main` (a Back or Forward included), or to
 * the element the hash names when the page holds one, also when only the hash changes (an anchored
 * section's heading). A change of the search alone moves nothing; the scroll is left to
 * `ScrollRestoration`. The shell's `main` is `id="main"` with `tabIndex={-1}`.
 */
export function useMainFocus(): void {
  const { pathname, hash } = useLocation();
  const arrival = useNavigationType();
  // The router's history, by its navigator: the first page is told apart per history.
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const placed = useRef<{ pathname: string; hash: string } | null>(null);

  useEffect(() => {
    const before = placed.current;
    if (before?.pathname === pathname && before.hash === hash) return;
    placed.current = { pathname, hash };
    if (isFirstPage(navigator, arrival)) return;

    if (before?.pathname === pathname) {
      namedBy(hash)?.focus({ preventScroll: true });
      return;
    }
    (namedBy(hash) ?? document.getElementById('main'))?.focus({ preventScroll: true });
  }, [pathname, hash, arrival, navigator]);
}
