/** The actions on a row of the lists: hiding or restoring it, and moving it. */
export type RowActionKind =
  'governorateVisibility' | 'areaVisibility' | 'governorateOrder' | 'areaOrder';

/**
 * The prefix of every row action's key, so a governorate's card reads every action on it and its
 * areas, pending or failed, wherever it was started.
 */
export const ROW_ACTIONS = ['admin', 'lookups', 'row'] as const;

/** A row action's key: the prefix, then its kind. */
export function rowActionKey(kind: RowActionKind) {
  return [...ROW_ACTIONS, kind] as const;
}

/** The kind of a row action, read back from its key. */
export function rowActionKindOf(key: readonly unknown[] | undefined): RowActionKind | undefined {
  return key?.[ROW_ACTIONS.length] as RowActionKind | undefined;
}
