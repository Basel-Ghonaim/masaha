import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * The element a hash names, as the focus takes it: the heading a section is titled by (it carries
 * `tabIndex={-1}`), or the element itself when it takes the focus.
 */
function landingOf(hash: string): HTMLElement | null {
  if (hash.length < 2) return null;
  let named: HTMLElement | null;
  try {
    named = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
  if (named === null) return null;
  return named.hasAttribute('tabindex')
    ? named
    : (named.querySelector<HTMLElement>('h2[tabindex], h3[tabindex]') ?? null);
}

/**
 * Lands the editor on the section the address's hash names (184): once its cards have drawn
 * (`drawn`, the read answered), it scrolls to it and focuses its heading — once per opening of the
 * page; a later change of the hash alone is the shell's (`useMainFocus`). The cards and the report's
 * notice draw only after the read, so the browser's own jump to the hash found nothing.
 */
export function useHashLanding(drawn: boolean): void {
  const { hash } = useLocation();
  const landed = useRef(false);

  useEffect(() => {
    if (!drawn || landed.current) return;
    landed.current = true;
    const target = landingOf(hash);
    if (target === null) return;
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }, [drawn, hash]);
}
