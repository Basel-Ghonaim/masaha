import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { clockOf } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { DAY_KEYS, SHOWN_DAYS } from '../../services/hoursForm';

/**
 * A verified space's hours to read: each day, Saturday first, its range or closed, then each shift by
 * its name in the interface's language (the Arabic one, marked, when the English is missing) and its
 * range. None while the hours were never saved.
 */
export function useReadOnlyHours(space: AdminSpace) {
  const copy = useCopy();
  const words = copy.spaces.editor.hours;
  const english = useLanguage() === 'en';
  const range = (from: number, to: number) => words.range({ from: clockOf(from), to: clockOf(to) });
  const hours = space.hours;

  return {
    title: copy.spaces.editor.sections.hours,
    none: hours === null ? words.none : null,
    days:
      hours === null
        ? []
        : SHOWN_DAYS.map((index) => {
            const day = hours.days[index] ?? null;
            return {
              key: index,
              name: words.days[DAY_KEYS[index]],
              value: day === null ? words.closed : range(day.opensMinute, day.closesMinute),
              closed: day === null,
            };
          }),
    shiftsTitle: words.shifts,
    shifts: (hours?.shifts ?? []).map((shift) => {
      const fallback = english && shift.nameEn === null;
      return {
        key: shift.id,
        name: english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
        lang: fallback ? ('ar' as const) : undefined,
        value: range(shift.startsMinute, shift.endsMinute),
      };
    }),
  };
}
