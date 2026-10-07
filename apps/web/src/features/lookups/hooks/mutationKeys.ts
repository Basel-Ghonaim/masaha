/** The actions on a governorate's or an area's row: hiding or restoring it, and moving it. */
export type RowActionKind =
  'governorateVisibility' | 'areaVisibility' | 'governorateOrder' | 'areaOrder';

/**
 * The prefix of every governorate's and area's row action's key, so a governorate's card reads every
 * action on it and its areas, pending or failed, wherever it was started.
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

/** The actions on an amenity's row: retiring or restoring it, its filter flag, and moving it. */
export type AmenityActionKind = 'amenityVisibility' | 'amenityFilter' | 'amenityOrder';

/**
 * The prefix of every amenity action's key, apart from the governorates' so neither list reads the
 * other's: the amenities' section reads every action on its rows, pending or failed.
 */
export const AMENITY_ACTIONS = ['admin', 'lookups', 'amenity'] as const;

/** An amenity action's key: the prefix, then its kind. */
export function amenityActionKey(kind: AmenityActionKind) {
  return [...AMENITY_ACTIONS, kind] as const;
}

/** The kind of an amenity action, read back from its key. */
export function amenityActionKindOf(
  key: readonly unknown[] | undefined,
): AmenityActionKind | undefined {
  return key?.[AMENITY_ACTIONS.length] as AmenityActionKind | undefined;
}
