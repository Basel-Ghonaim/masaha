/** One package's row, ready to render: its facts, its switch, its edit, and a paused one's shift. */
export type PackageRowView = {
  key: number;
  name: string;
  /** Its terms in one line, as `summaryOf` words them. */
  summary: string;
  price: string;
  /** The badge of a package no longer offered. */
  paused: string | null;
  available: {
    label: string;
    /** The switch's accessible name: the package's, then «متاحة». */
    name: string;
    checked: boolean;
    /** Its change waits on the server: the switch stays in the focus order, and a press is ignored. */
    pending: boolean;
    toggle: (checked: boolean) => void;
  };
  edit: { label: string; name: string; run: () => void };
  /** A paused package that still holds a shift: said, with the way to clear it (finding 81). */
  heldShift: { text: string; clear: { label: string; pending: boolean; run: () => void } } | null;
};
