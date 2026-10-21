type Action = { label: string; run: () => void };

/**
 * Near me's state line: nothing; asking, with the privacy line; a location in use, said by where it
 * came from, with the approximation and the privacy line while it sorts the list, and the ways to
 * stop and to clear it; or refused or imprecise, with the fallbacks.
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
      clear: Action;
    }
  | { kind: 'denied' | 'imprecise'; title: string; text: string; fallbacks: Action[] };
