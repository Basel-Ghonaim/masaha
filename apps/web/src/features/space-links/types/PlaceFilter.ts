/** The list's place filter: one governorate or one area, by its id; `null` keeps every place. */
export type PlaceFilter = { governorateId: number } | { areaId: number } | null;
