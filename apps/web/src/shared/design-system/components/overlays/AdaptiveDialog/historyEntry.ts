import { useEffect, useRef } from 'react';

/**
 * The key an open dialog's history entry carries, beside the router's own state (its key, its
 * index), which the entry copies, so the router reads a Back from it as a move to the same place.
 */
const MARK = 'masahaOverlay';

// This page load's own prefix, so an entry an earlier load marked (before a reload) is told apart.
const LOAD = Math.random().toString(36).slice(2);
let opened = 0;

// The marks of the dialogs open now; and whether a step back from a stale entry is under way.
const held = new Set<string>();
let leaving = false;
let watching = false;

function markOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null;
  const mark = (state as Record<string, unknown>)[MARK];
  return typeof mark === 'string' ? mark : null;
}

/** A new entry at the same address, the router's state kept and `mark` added. */
function push(mark: string): void {
  const state: unknown = window.history.state;
  window.history.pushState({ ...(typeof state === 'object' ? state : null), [MARK]: mark }, '');
}

/**
 * Steps back from an entry a dialog marked that no open dialog holds: one a reload left (the
 * dialog's state is gone with the page) or a Forward reached. Without it, Back from there would
 * land on the same page and seem to do nothing.
 */
function leaveStale(): void {
  if (leaving) return;
  const mark = markOf(window.history.state);
  if (mark === null || held.has(mark)) return;
  leaving = true;
  window.history.back();
}

function onMove(): void {
  leaving = false;
  leaveStale();
}

/**
 * Leaves a stale entry now (a dialog mounting after a reload), and from then on on every move
 * through the history (a Forward). Registered when the first dialog mounts, and kept.
 */
export function watchStaleEntries(): void {
  if (!watching) {
    watching = true;
    window.addEventListener('popstate', onMove);
  }
  leaveStale();
}

/**
 * While `open`, one history entry at the same address (ADR 0021: the dialog has no address of its
 * own), so the browser's or the phone's Back closes it (`close`) and the page stays as it was;
 * while `holding()`, Back puts the entry back and the dialog stays. Closed any other way, the entry
 * is gone back from, so the next Back leaves the page; replaced meanwhile (a link inside it,
 * followed with `replace`), it is not. A double run of the effect (React's StrictMode) keeps the
 * one entry: going back waits a microtask, and does nothing if the dialog is open again by then.
 */
export function useHistoryEntry(open: boolean, close: () => void, holding: () => boolean): void {
  const mark = useRef<string | null>(null);
  const latest = useRef({ close, holding });

  useEffect(() => {
    latest.current = { close, holding };
  });

  useEffect(() => {
    if (!open) return undefined;
    opened += 1;
    mark.current ??= `${LOAD}:${String(opened)}`;
    const mine = mark.current;
    held.add(mine);
    if (markOf(window.history.state) !== mine) push(mine);

    const onPop = () => {
      if (markOf(window.history.state) === mine) return;
      if (latest.current.holding()) {
        push(mine);
        return;
      }
      latest.current.close();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      held.delete(mine);
      queueMicrotask(() => {
        if (held.has(mine)) return;
        mark.current = null;
        if (markOf(window.history.state) === mine) window.history.back();
      });
    };
  }, [open]);
}
