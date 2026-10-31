/**
 * Where a row stands, for the sheet that edits it: its id, its list's ids in order, and the save of
 * a new order of that list (the whole order, which the list's order route takes).
 */
export type RowPlace = {
  id: number;
  ids: readonly number[];
  order: (ids: number[]) => Promise<unknown>;
};
