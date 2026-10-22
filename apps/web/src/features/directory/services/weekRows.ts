import { gazaClockOf } from '@masaha/shared/core';
import { DAY_MINUTES, type OpeningRange } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import { isolated } from '@shared/forms';
import { clockOf } from '@shared/lib';

type Words = Pick<
  Catalogue['directory']['page']['hours'],
  'dayNames' | 'pair' | 'run' | 'closed' | 'allDay'
>;
type DayKey = keyof Words['dayNames'];

/** The week as the page reads it, Saturday first: each day's key and its index in `days`. */
const WEEK: readonly { key: DayKey; index: number }[] = [
  { key: 'sat', index: 6 },
  { key: 'sun', index: 0 },
  { key: 'mon', index: 1 },
  { key: 'tue', index: 2 },
  { key: 'wed', index: 3 },
  { key: 'thu', index: 4 },
  { key: 'fri', index: 5 },
];

/** A row of the hours' table: a day or a run of days with the same hours. */
export type WeekRow = {
  key: string;
  label: string;
  value: string;
  today: boolean;
  closed: boolean;
};

/**
 * The week's opening hours as rows, Saturday first: consecutive days with the same hours share a
 * row (a pair «السبت، الأحد», a run «السبت – الخميس»), each its range left to right, «مغلقة» or
 * «على مدار الساعة»; `all` gives each day its own row. Today, on Gaza's calendar, is marked. The rows
 * may be expanded when grouping leaves more than two.
 */
export function weekRows(
  days: (OpeningRange | null)[],
  now: Date,
  words: Words,
  all: boolean,
): { rows: WeekRow[]; canExpand: boolean } {
  const today = gazaClockOf(now).dayOfWeek;
  const valueOf = (range: OpeningRange | null) => {
    if (range === null) return words.closed;
    if (range.opensMinute === 0 && range.closesMinute === DAY_MINUTES) return words.allDay;
    return isolated(`${clockOf(range.opensMinute)}–${clockOf(range.closesMinute)}`);
  };

  const groups: { keys: DayKey[]; value: string; closed: boolean; today: boolean }[] = [];
  for (const { key, index } of WEEK) {
    const range = days[index] ?? null;
    const value = valueOf(range);
    const last = groups.at(-1);
    if (last?.value === value) {
      last.keys.push(key);
      last.today ||= index === today;
    } else {
      groups.push({ keys: [key], value, closed: range === null, today: index === today });
    }
  }

  const labelOf = (keys: DayKey[]) => {
    const [first, ...rest] = keys.map((key) => words.dayNames[key]);
    const last = rest.at(-1);
    if (first === undefined || last === undefined) return first ?? '';
    return rest.length === 1 ? words.pair({ first, second: last }) : words.run({ first, last });
  };

  const rows = all
    ? WEEK.map(({ key, index }) => ({
        key,
        label: words.dayNames[key],
        value: valueOf(days[index] ?? null),
        today: index === today,
        closed: (days[index] ?? null) === null,
      }))
    : groups.map((group) => ({
        key: group.keys[0] ?? '',
        label: labelOf(group.keys),
        value: group.value,
        today: group.today,
        closed: group.closed,
      }));
  return { rows, canExpand: groups.length > 2 };
}
