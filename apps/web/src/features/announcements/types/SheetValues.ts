import type { AnnouncementType } from '@masaha/shared/announcements';

/**
 * What the announcement sheet holds: the type, the two texts, and each end of the period as a mode,
 * a Gaza date (`YYYY-MM-DD`) and a time (`HH:MM`). Each time field is named as the request's instant
 * (`startsAt`, `endsAt`), so a refusal of the period, the browser's or the server's, lands on it.
 */
export type SheetValues = {
  type: AnnouncementType;
  textAr: string;
  textEn: string;
  startMode: 'now' | 'at';
  startDate: string;
  /** The start's time on Gaza's clock, `HH:MM`. */
  startsAt: string;
  endMode: 'at' | 'none';
  endDate: string;
  /** The end's time on Gaza's clock, `HH:MM`. */
  endsAt: string;
};
