import { useEffect, useLayoutEffect, useRef } from 'react';

/** A row of the spaces that left, which carries its key; the action set in it. */
const ROW = 'data-unlisted-key';
/** A card's action, over its cover. */
const CARD_ACTION = '[data-card-action] button';

/**
 * Keeps the focus when a space that left is removed while its row's action holds it (DI-52): the
 * next row's action takes it, else the first card's heart, else the count (`countRef`,
 * `tabIndex={-1}`). `viewRef` is the element the cards and the rows are drawn in; each row carries
 * `data-unlisted-key`, each card's action `data-card-action`. Checked after each drawing, so a row
 * that leaves with the list read again hands the focus on.
 */
export function useUnlistedFocus(keys: readonly string[]) {
  const view = useRef<HTMLElement | null>(null);
  const count = useRef<HTMLParagraphElement | null>(null);
  /** The row whose action holds the focus, and the rows as drawn when it took it. */
  const held = useRef<{ key: string; order: readonly string[] } | null>(null);

  useEffect(() => {
    const element = view.current;
    if (element === null) return;
    const onIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const key = target?.closest(`[${ROW}]`)?.getAttribute(ROW) ?? null;
      held.current = key === null ? null : { key, order: keysOf(element) };
    };
    const onOut = (event: FocusEvent) => {
      // A focus going elsewhere lets the row go; one dropped with its element keeps it.
      if (event.relatedTarget !== null) held.current = null;
    };
    element.addEventListener('focusin', onIn);
    element.addEventListener('focusout', onOut);
    return () => {
      element.removeEventListener('focusin', onIn);
      element.removeEventListener('focusout', onOut);
    };
  }, []);

  useLayoutEffect(() => {
    const element = view.current;
    const last = held.current;
    if (element === null || last === null || keys.includes(last.key)) return;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    held.current = null;
    const next = last.order
      .slice(last.order.indexOf(last.key) + 1)
      .map((key) => element.querySelector<HTMLElement>(`[${ROW}="${key}"] button`))
      .find((action) => action !== null);
    const target = next ?? element.querySelector<HTMLElement>(CARD_ACTION) ?? count.current;
    target?.focus();
  });

  return { viewRef: view, countRef: count };
}

/** The rows' keys, in order, as drawn. */
function keysOf(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll(`[${ROW}]`), (row) => row.getAttribute(ROW) ?? '');
}
