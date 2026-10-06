/**
 * What an action on a row of the lists acts on: its governorate, and the area when the row is one.
 * Every row action's variables carry it, so a card finds the actions on it and on its areas.
 */
export type RowAction = { governorateId: number; areaId?: number };
