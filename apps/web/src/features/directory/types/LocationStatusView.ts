type Action = { label: string; run: () => void };

/**
 * Near me's state line: nothing (also while a point is picked on the map); asking, with the privacy
 * line; a location in use, said by where it came from, with the approximation and the privacy line
 * while it sorts the list, and the ways to stop, change and clear it; or refused or imprecise, with
 * the fallbacks.
 */
export type LocationStatusView =
  | { kind: 'none' }
  | { kind: 'locating'; line: string; privacy: string }
  | {
      kind: 'granted';
      line: string | null;
      approximate: string | null;
      privacy: string | null;
      stop: Action | null;
      /** Beside a point set by hand: set it again on the map. */
      change: Action | null;
      clear: Action;
    }
  | { kind: 'denied' | 'imprecise'; title: string; text: string; fallbacks: Action[] };
