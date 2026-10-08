/** A choice of one governorate or one area, by its id; `null` chooses none. */
export type PlaceValue = { governorateId: number } | { areaId: number } | null;
