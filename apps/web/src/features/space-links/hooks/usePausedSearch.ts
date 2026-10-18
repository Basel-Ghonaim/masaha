import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** How long the search waits after the last key before it asks again. */
const SEARCH_PAUSE_MS = 400;

/**
 * A list's search field, whose text reaches the address once typing pauses: `write` is handed the
 * search the text makes (`searchOf`, the server's rule), and compares it with the address as it
 * stands. An address changed elsewhere (Back, a link, Clear) sets the text again; the text the
 * address already reads keeps its own spaces, so a word typed after a pause follows the space before
 * it.
 */
export function usePausedSearch({
  q,
  searchOf,
  write,
}: {
  q: string | undefined;
  searchOf: (text: string) => string | undefined;
  write: (q: string | undefined) => void;
}) {
  const [text, setText] = useState(q ?? '');
  const [shownQ, setShownQ] = useState(q);
  if (q !== shownQ) {
    setShownQ(q);
    if (searchOf(text) !== q) setText(q ?? '');
  }

  // The caller's latest functions, so a pause is not restarted by a render.
  const latest = useRef({ searchOf, write });
  useLayoutEffect(() => {
    latest.current = { searchOf, write };
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      latest.current.write(latest.current.searchOf(text));
    }, SEARCH_PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text]);

  return {
    text,
    change: setText,
    clear: () => {
      setText('');
    },
  };
}
