import { useCopy } from '@shared/copy';
import { isolated } from '@shared/forms';
import { clockOf } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/**
 * «الورديات», read first (S2, X1): the shifts on one line, each named in the interface's language —
 * the Arabic when it has no English — with its range. With none, that they are optional and what they
 * are for, with «إضافة وردية»; while the hours are not saved, that the hours come first, its action
 * opening their Sheet (DI-1). Its head is the hours group's.
 */
export function useShiftsSection(host: SectionHost) {
  const copy = useCopy();
  const words = copy.spaces.editor.shifts;
  const english = useLanguage() === 'en';
  const { space } = host;
  const shifts = space.hours?.shifts ?? [];
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'shifts',
    editable: host.editable,
    empty: shifts.length === 0,
    edit: () => {
      host.openSheet('shifts');
    },
  });
  const action = (label: string, sheet: 'hours' | 'shifts') =>
    host.editable
      ? {
          label,
          primary: false,
          run: () => {
            host.openSheet(sheet);
          },
        }
      : null;
  return {
    frame,
    separator: words.separator,
    shifts: shifts.map((shift) => {
      const englishName = english && shift.nameEn !== null;
      return {
        key: shift.id,
        name: englishName ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
        lang: english && !englishName ? ('ar' as const) : undefined,
        range: isolated(
          words.range({ from: clockOf(shift.startsMinute), to: clockOf(shift.endsMinute) }),
        ),
      };
    }),
    empty:
      shifts.length > 0
        ? null
        : space.hours === null
          ? { text: words.noHours.text, action: action(words.noHours.action, 'hours') }
          : {
              text: words.empty.text,
              hint: words.empty.hint,
              action: action(words.empty.action, 'shifts'),
            },
  };
}
