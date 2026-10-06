/**
 * A sheet that adds or edits, ready to render: the button that opens it (its words, and its name
 * when that says more, such as the row it edits), and the sheet's title, description and close.
 */
export type SheetView = {
  trigger: string;
  triggerName?: string;
  title: string;
  /** The governorate an area belongs to, in its English name. */
  description?: string;
  closeLabel: string;
};
