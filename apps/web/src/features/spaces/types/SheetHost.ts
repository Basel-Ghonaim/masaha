/**
 * What the editor hands one section's Sheet: whether it is open, the way to close it, to give the
 * focus back once it has closed, and to say whether it has changes (the leave guard reads them).
 */
export type SheetHost = {
  open: boolean;
  close: () => void;
  returnFocus: () => void;
  reportDirty: (dirty: boolean) => void;
};
