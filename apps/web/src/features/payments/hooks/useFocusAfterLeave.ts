import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** A row's action, inside the row's slot, which carries the row's key. */
const ACTION = '[data-row-action]';
const ROW = 'data-row-key';

type Keeper = {
  list: RefObject<HTMLElement | null>;
  totals: RefObject<HTMLElement | null>;
  held: RefObject<string | null>;
  order: RefObject<readonly string[]>;
  before: RefObject<readonly string[]>;
};

/** The action of the row `key`, while it is drawn. */
const actionOf = ({ list }: Keeper, key: string) =>
  list.current?.querySelector<HTMLElement>(`[${ROW}="${key}"] ${ACTION}`) ?? null;

/** Gives the focus to the first action after the row `key`, else the totals line. */
function move(keeper: Keeper, key: string) {
  keeper.held.current = null;
  const rows = keeper.order.current.includes(key) ? keeper.order.current : keeper.before.current;
  const index = rows.indexOf(key);
  for (const next of index === -1 ? [] : rows.slice(index + 1)) {
    const action = actionOf(keeper, next);
    if (action !== null) {
      action.focus();
      return;
    }
  }
  keeper.totals.current?.focus();
}

/**
 * Keeps the focus when the row whose action holds it leaves, or loses its action (DI-8): the next
 * row's action takes it, else the totals line (`totalsRef`, `tabIndex={-1}`). `listRef` is the
 * element the rows are drawn in; each row's slot carries `data-row-key`, its action
 * `data-row-action`. `leave` tells the keeper a row's action is going — the void's «⋯» says so once
 * it leaves under the focus.
 */
export function useFocusAfterLeave(keys: readonly string[]) {
  const list = useRef<HTMLElement | null>(null);
  const totals = useRef<HTMLElement | null>(null);
  /** The row whose action holds the focus. */
  const held = useRef<string | null>(null);
  /** The rows as last drawn, and as drawn before them, to find the row after one that left. */
  const order = useRef(keys);
  const before = useRef(keys);
  const keeper = useRef<Keeper>({ list, totals, held, order, before });

  // Which row's action holds the focus: a focus going elsewhere lets it go; one dropped with its
  // element (no element after it) keeps it, so the row's leaving can be seen.
  useEffect(() => {
    const element = list.current;
    if (element === null) return;
    const onIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      held.current =
        target === null || target.closest(ACTION) === null
          ? null
          : (target.closest(`[${ROW}]`)?.getAttribute(ROW) ?? null);
    };
    const onOut = (event: FocusEvent) => {
      if (event.relatedTarget !== null) held.current = null;
    };
    element.addEventListener('focusin', onIn);
    element.addEventListener('focusout', onOut);
    return () => {
      element.removeEventListener('focusin', onIn);
      element.removeEventListener('focusout', onOut);
    };
  }, []);

  // After each drawing: the held row's action gone with the focus on nothing, the next one takes it.
  useLayoutEffect(() => {
    if (order.current !== keys) {
      before.current = order.current;
      order.current = keys;
    }
    const key = held.current;
    if (key === null) return;
    const active = document.activeElement;
    if (actionOf(keeper.current, key) !== null || (active !== null && active !== document.body)) {
      return;
    }
    move(keeper.current, key);
  });

  /** The row `key`'s action is leaving: once it is gone, the focus moves on. */
  const leave = useCallback((key: string) => {
    if (actionOf(keeper.current, key) === null) move(keeper.current, key);
    else held.current = key;
  }, []);

  return { listRef: list, totalsRef: totals, leave };
}
