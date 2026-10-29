import type {
  Announcement,
  AnnouncementType,
  CreateAnnouncementRequest,
  EditAnnouncementRequest,
} from '@masaha/shared/announcements';
import { addDays, gazaClockOf, gazaInstant } from '@masaha/shared/core';
import { clockOf } from '@shared/lib';
import type { SheetValues } from '../types/SheetValues';

/** The minute of the day a time `HH:MM` names, 0–1439; none for a text that is not one. */
export function minuteOf(time: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (match === null) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : undefined;
}

/**
 * The instant of a Gaza date and time, as the request sends it (S9): Gaza's wall clock, never the
 * browser's. A date or a time that cannot be read is sent as typed, so the contract refuses it on its
 * field rather than the sheet sending another instant.
 */
export function instantOf(date: string, time: string): string {
  const minute = minuteOf(time);
  if (minute === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T${time}`;
  return gazaInstant(date, minute).toISOString();
}

/**
 * Whether a Gaza date and time typed in the sheet are the loaded instant's, at the precision the sheet
 * shows: its Gaza date and minute. The server keeps «now» with its seconds, which the sheet never shows,
 * so an instant compared to the millisecond would move a start nobody touched. A date or a time that
 * cannot be read is never the same.
 */
const sameMinute = (date: string, time: string, loaded: string) => {
  const clock = gazaClockOf(new Date(loaded));
  return clock.date === date && clock.minute === minuteOf(time);
};

/**
 * A new announcement's request: «الآن» sends no start (the server's now), «بلا موعد» no end, and a
 * blank English text is left out. The Arabic text goes as typed; the contract trims and refuses it.
 */
export function createRequestOf(values: SheetValues): CreateAnnouncementRequest {
  return {
    type: values.type,
    textAr: values.textAr,
    ...(values.textEn.trim() !== '' && { textEn: values.textEn }),
    ...(values.startMode === 'at' && { startsAt: instantOf(values.startDate, values.startsAt) }),
    ...(values.endMode === 'at' && { endsAt: instantOf(values.endDate, values.endsAt) }),
  };
}

/**
 * An edit's request: only what differs from the announcement loaded — a start or an end compared at
 * its Gaza date and minute, as the sheet shows it; an English text cleared is `textEn: null`, and
 * «بلا موعد» over an end is `endsAt: null`. Nothing changed is `{}`.
 */
export function editRequestOf(values: SheetValues, loaded: Announcement): EditAnnouncementRequest {
  const request: EditAnnouncementRequest = {};
  if (values.type !== loaded.type) request.type = values.type;
  if (values.textAr.trim() !== loaded.textAr) request.textAr = values.textAr;
  const textEn = values.textEn.trim();
  if (textEn === '' && loaded.textEn !== null) request.textEn = null;
  if (textEn !== '' && textEn !== loaded.textEn) request.textEn = values.textEn;
  if (!sameMinute(values.startDate, values.startsAt, loaded.startsAt))
    request.startsAt = instantOf(values.startDate, values.startsAt);
  if (values.endMode === 'none') {
    if (loaded.endsAt !== null) request.endsAt = null;
  } else {
    if (loaded.endsAt === null || !sameMinute(values.endDate, values.endsAt, loaded.endsAt))
      request.endsAt = instantOf(values.endDate, values.endsAt);
  }
  return request;
}

/**
 * The sheet's first values, on Gaza's wall clock (S9). A new announcement: of `type`, starting now —
 * today at this minute, should «في موعد» be chosen — and ending today at 18:00, or at the next whole
 * hour from 17:00 on. An edit: the announcement as loaded, «بلا موعد» when it has no end.
 */
export function valuesOf(
  loaded: Announcement | null,
  now: Date,
  type: AnnouncementType = 'GENERAL',
): SheetValues {
  const today = gazaClockOf(now);
  const next = Math.floor(today.minute / 60) + 1;
  const end =
    today.minute < 17 * 60
      ? { date: today.date, time: '18:00' }
      : next < 24
        ? { date: today.date, time: clockOf(next * 60) }
        : { date: addDays(today.date, 1), time: '00:00' };
  if (loaded === null) {
    return {
      type,
      textAr: '',
      textEn: '',
      startMode: 'now',
      startDate: today.date,
      startsAt: clockOf(today.minute),
      endMode: 'at',
      endDate: end.date,
      endsAt: end.time,
    };
  }
  const start = gazaClockOf(new Date(loaded.startsAt));
  const ends = loaded.endsAt === null ? null : gazaClockOf(new Date(loaded.endsAt));
  return {
    type: loaded.type,
    textAr: loaded.textAr,
    textEn: loaded.textEn ?? '',
    startMode: 'at',
    startDate: start.date,
    startsAt: clockOf(start.minute),
    endMode: ends === null ? 'none' : 'at',
    endDate: ends?.date ?? end.date,
    endsAt: ends === null ? end.time : clockOf(ends.minute),
  };
}
