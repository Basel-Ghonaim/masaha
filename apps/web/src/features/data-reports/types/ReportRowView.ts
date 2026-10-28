import type { StatusView } from '../services/reportView';

/** One of the owner's reports, worded for its row and its card. */
export type ReportRowView = {
  key: string;
  id: number;
  /** The field group it names. */
  field: string;
  /** Its message, or the line that says there is none, shown muted. */
  message: { text: string; none: boolean };
  /** The Gaza day it was made, never the time (DI-34). */
  day: string;
  /** «زائر · {day}»: the card's line; the owner never sees who reported (O12). */
  byline: string;
  status: StatusView;
  /** Opens it in the decision sheet. */
  open: { label: string; run: () => void };
};
