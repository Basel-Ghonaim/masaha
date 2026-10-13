import { useEffect, useRef, useState } from 'react';

// The band of the window a section is in view in: below the top bar and the row of sections, and
// above the window's lower half.
const BAND = '-128px 0px -50% 0px';
// How long a section chosen in the navigation stays marked while the page scrolls to it.
const HOLD_MS = 900;

/**
 * Which of the sections, by their ids, is in view: the first, in order, that crosses the band near
 * the top of the window, or the first until one does. A section chosen in the navigation is marked
 * at once (`choose`), before the scroll it starts has settled. The sections are looked for again each
 * time the ids change, so a page passes none until they are drawn, and each time `drawn` changes, as
 * when the same sections are drawn anew (an editable page turned read-only).
 */
export function useSectionInView(ids: readonly string[], drawn: string) {
  const [chosen, setCurrent] = useState<string | undefined>(undefined);
  const holdUntil = useRef(0);
  const key = ids.join(' ');

  useEffect(() => {
    const order = key.split(' ');
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (Date.now() < holdUntil.current) return;
        const first = order.find((id) => visible.has(id));
        if (first !== undefined) setCurrent(first);
      },
      { rootMargin: BAND },
    );
    for (const id of order) {
      const element = document.getElementById(id);
      if (element !== null) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [key, drawn]);

  return {
    current: chosen !== undefined && ids.includes(chosen) ? chosen : ids[0],
    choose: (id: string) => {
      holdUntil.current = Date.now() + HOLD_MS;
      setCurrent(id);
    },
  };
}
