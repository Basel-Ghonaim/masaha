import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** A card's action, inside the card's item, which carries the card's key. */
const ACTION = '[data-card-action]';
const CARD = 'data-card-key';

type Keeper = {
  list: RefObject<HTMLElement | null>;
  tabs: RefObject<HTMLDivElement | null>;
  held: RefObject<string | null>;
  order: RefObject<readonly string[]>;
  before: RefObject<readonly string[]>;
};

/** The first action of the card `key`, while it is drawn. */
const actionOf = ({ list }: Keeper, key: string) =>
  list.current?.querySelector<HTMLElement>(`[${CARD}="${key}"] ${ACTION}`) ?? null;

/** Gives the focus to the first action of the cards after `key`, else the tab shown. */
function move(keeper: Keeper, key: string) {
  keeper.held.current = null;
  const cards = keeper.order.current.includes(key) ? keeper.order.current : keeper.before.current;
  const index = cards.indexOf(key);
  for (const next of index === -1 ? [] : cards.slice(index + 1)) {
    const action = actionOf(keeper, next);
    if (action !== null) {
      action.focus();
      return;
    }
  }
  keeper.tabs.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
}

/**
 * Keeps the focus when the card whose action holds it leaves its tab — ended, started or deleted —
 * (DI-24): the next card's first action takes it, else the tab shown, in the tabs' list (`tabsRef`).
 * `listRef` is the element the cards are drawn in; each card's item carries `data-card-key`, its
 * actions `data-card-action`. `leave` tells the keeper a card's action is going — the «⋯» says so
 * once it leaves under the focus; `settle` places the focus once a dialog the list held for a card
 * closes and its opener is gone: the card's first action, else on as above. The refs live here, read
 * only in effects and events, never while drawing (the React compiler's rule).
 */
export function useCardFocus(keys: readonly string[]) {
  const list = useRef<HTMLElement | null>(null);
  const tabs = useRef<HTMLDivElement | null>(null);
  /** The card whose action holds the focus. */
  const held = useRef<string | null>(null);
  /** The cards as last drawn, and as drawn before them, to find the card after one that left. */
  const order = useRef(keys);
  const before = useRef(keys);
  const keeper = useRef<Keeper>({ list, tabs, held, order, before });

  // Which card's action holds the focus: a focus going elsewhere lets it go; one dropped with its
  // element (no element after it) keeps it, so the card's leaving can be seen.
  useEffect(() => {
    const element = list.current;
    if (element === null) return;
    const onIn = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      held.current =
        target === null || target.closest(ACTION) === null
          ? null
          : (target.closest(`[${CARD}]`)?.getAttribute(CARD) ?? null);
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

  // After each drawing: the held card gone with the focus on nothing, the next one takes it.
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

  /** The card `key`'s action is leaving: once it is gone, the focus moves on. */
  const leave = useCallback((key: string) => {
    if (actionOf(keeper.current, key) === null) move(keeper.current, key);
    else held.current = key;
  }, []);

  /** A card's dialog closed with its opener gone: the card's first action, else the next one's. */
  const settle = useCallback((key: string) => {
    const action = actionOf(keeper.current, key);
    if (action === null) move(keeper.current, key);
    else action.focus();
  }, []);

  return { listRef: list, tabsRef: tabs, leave, settle };
}
