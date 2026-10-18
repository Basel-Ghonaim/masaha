import { useEffect, useRef, type FocusEvent } from 'react';

/**
 * Keeps the focus in a list: when the element inside it that held the focus leaves, as a deleted
 * row does, the focus moves to the list (`region`, focusable) rather than being lost. `onFocus`
 * goes on the list, and `rows` are what it shows.
 */
export function useFocusKeeper(rows: unknown) {
  const region = useRef<HTMLElement>(null);
  // The last element inside the list that held the focus.
  const focused = useRef<Element | null>(null);

  useEffect(() => {
    const element = focused.current;
    // Only a focus lost with its element: one moved elsewhere on purpose stays there.
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (element !== null && !element.isConnected && lost) {
      focused.current = null;
      region.current?.focus();
    }
  }, [rows]);

  return {
    region,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target !== region.current) focused.current = event.target;
    },
  };
}
