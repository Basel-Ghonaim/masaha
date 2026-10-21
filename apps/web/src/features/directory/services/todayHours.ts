import { gazaClockOf } from '@masaha/shared/core';
import { DAY_MINUTES, type OpeningRange } from '@masaha/shared/spaces';
import { isolated } from '@shared/forms';
import { clockOf } from '@shared/lib';

/** The card's words for today's hours. */
type TodayWords = {
  today: (values: { range: string }) => string;
  closedToday: string;
  openAllDay: string;
};

/**
 * Today's opening hours as the card says them, today being Gaza's (the week runs Sunday 0 to
 * Saturday 6, as `days` does): closed, around the clock, or the range, left to right. Hours never
 * saved draw nothing.
 */
export function todayHours(
  days: (OpeningRange | null)[] | null,
  now: Date,
  words: TodayWords,
): string | null {
  if (days === null) return null;
  const today = days[gazaClockOf(now).dayOfWeek] ?? null;
  if (today === null) return words.closedToday;
  if (today.opensMinute === 0 && today.closesMinute === DAY_MINUTES) return words.openAllDay;
  return words.today({
    range: isolated(`${clockOf(today.opensMinute)}–${clockOf(today.closesMinute)}`),
  });
}
