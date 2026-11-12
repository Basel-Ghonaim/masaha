import {
  updateSpaceHoursSchema,
  type OpeningRange,
  type Shift,
  type UpdateSpaceHoursRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useWatch, type Path } from 'react-hook-form';
import {
  FRIDAY,
  SHOWN_DAYS,
  WEEKDAYS,
  fitsSimple,
  sameWeek,
  sheetOf,
  shiftsOutside,
  toCustom,
  toSimple,
  weekOf,
  type HoursSheetValues,
} from '../../services/hoursSheet';
import { timeChoiceOf } from '../../services/timeOptions';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';

/** The Sheet's form: the week as it is chosen. */
type Values = HoursSheetValues;

/** A day's key in the catalogue's week, by the contract's index. */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const closes = (index: number) => `days.${String(index)}.closesMinute` as Path<Values>;

// The fields a refusal can name, in the order the Sheet shows them.
const FIELDS: Path<Values>[] = SHOWN_DAYS.map(closes);

/**
 * «ساعات العمل»'s Sheet, ready to render (W2–W5): the majority first — Saturday to Thursday's one
 * range, Friday its own when «مفتوحة يوم الجمعة أيضًا» is ticked, prefilled with the main hours — or
 * «تخصيص الأيام», every day its switch and its two times; saved hours that differ from day to day
 * open in it, and going back with differing days asks first. Times are chosen every half hour, a day
 * switched on takes the hours of the last open day edited, «إلى» after «من» is said on its row, and a
 * week with no open day is said once. A saved shift the new week leaves outside every open day is
 * said before anything is sent, with the way to the shifts (DI-2). The request is the new week with
 * the saved shifts exactly as the space was last read when «حفظ» is pressed (S5), so a shift saved
 * meanwhile is kept; a week as saved sends nothing.
 */
export function useHoursSheet(host: SectionHost) {
  const copy = useCopy();
  const words = copy.spaces.editor.hours;
  const english = useLanguage() === 'en';
  const { place, space } = host;
  const sheet = host.sheet('hours');
  const scope = EDITOR_SCOPES[place];
  const client = useQueryClient();
  const title = sectionName('hours', copy);
  const [noneOpen, setNoneOpen] = useState(false);
  const [unifying, setUnifying] = useState(false);
  // The last open day whose hours were edited: a day switched on takes them (W5).
  const [lastEdited, setLastEdited] = useState<number | null>(null);
  const save = useSaveGroup(place, space.id, 'hours', (request: UpdateSpaceHoursRequest) =>
    scope.repository.updateHours(space.id, request),
  );
  const valuesOf = (): Values => sheetOf(space.hours);
  // The saved shifts as last read: the week is sent with them, never with those read at opening.
  const saved = space.hours?.shifts ?? [];
  const shifts = useRef<Shift[]>(saved);
  useEffect(() => {
    shifts.current = saved;
  });
  const form = useServerForm<Values, UpdateSpaceHoursRequest>({
    schema: updateSpaceHoursSchema,
    defaultValues: valuesOf(),
    fields: FIELDS,
    prepare: (values) => ({
      days: weekOf(values),
      shifts: shifts.current.map(({ id, nameAr, nameEn, startsMinute, endsMinute }) => ({
        id,
        nameAr,
        nameEn,
        startsMinute,
        endsMinute,
      })),
    }),
    submit: async (request) => {
      if (request.days.every((day) => day === null)) {
        setNoneOpen(true);
        return;
      }
      setNoneOpen(false);
      if (space.updatedAt.hours !== null && sameWeek(request.days, space.hours)) {
        toast(copy.spaces.editor.section.unchanged);
        sheet.close();
        return;
      }
      try {
        await save.mutateAsync(request);
        sheet.close();
      } catch (error) {
        // A shift removed meanwhile (422 on its id), or one still in use (409): the space as it is.
        const refused = toAppError(error);
        if (refused.status === 409 || refused.errors !== undefined) {
          void client.invalidateQueries({ queryKey: scope.spaceKey(space.id) });
        }
        throw error;
      }
    },
    failureTitle: copy.spaces.editor.section.failureTitle({ section: title }),
    fieldLines: Object.fromEntries(FIELDS.map((path) => [path, { out_of_range: words.after }])),
    failureLines: { ...meanwhileLines(place, copy), validation: words.shiftsChanged },
  });
  useResetOnOpen(sheet.open, () => {
    setLastEdited(null);
    setNoneOpen(false);
    setUnifying(false);
    form.form.reset(valuesOf());
  });
  const frame = useSheetFrame({
    host: sheet,
    title: words.sheetTitle,
    description: words.sheetDescription,
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: form.form.formState.isDirty,
    },
  });

  const { control, setValue, getValues, formState } = form.form;
  const watched = useWatch({ control }) as Values;
  const values: Values = { ...getValues(), ...watched };
  const set = (path: Path<Values>, value: unknown) => {
    setValue(path, value as never, { shouldDirty: true });
    if (formState.isSubmitted) void form.form.trigger(FIELDS);
  };
  const replace = (next: HoursSheetValues) => {
    (['custom', 'main', 'fridayOpen', 'friday', 'days'] as const).forEach((key) => {
      setValue(key, next[key] as never, { shouldDirty: true });
    });
  };
  const dayName = (index: number) => words.week.dayNames[DAY_KEYS[index] ?? 'sat'];
  const errorOf = (indexes: readonly number[]) =>
    indexes.map((index) => form.errors[closes(index)]).find((error) => error !== undefined);

  const range = (
    path: 'main' | 'friday' | `days.${number}`,
    current: OpeningRange,
    labels: { from: string; to: string },
    index: number | null,
  ) => {
    const write = (part: 'opensMinute' | 'closesMinute') => (minute: number) => {
      if (index !== null) setLastEdited(index);
      set(`${path}.${part}` as Path<Values>, minute);
    };
    return {
      from: timeChoiceOf(
        labels.from,
        current.opensMinute,
        false,
        write('opensMinute'),
        form.isPending,
      ),
      to: timeChoiceOf(
        labels.to,
        current.closesMinute,
        true,
        write('closesMinute'),
        form.isPending,
      ),
    };
  };

  const outside = formState.isSubmitted ? shiftsOutside(weekOf(values), saved) : [];
  const listOf = (names: string[]) =>
    new Intl.ListFormat(english ? 'en' : 'ar-u-nu-latn', { type: 'conjunction' }).format(names);

  return {
    frame,
    custom: values.custom,
    simple: {
      legend: words.weekdays,
      main: range('main', values.main, { from: words.from, to: words.to }, null),
      mainError: errorOf(WEEKDAYS),
      friday: {
        label: words.fridayOpen,
        checked: values.fridayOpen,
        toggle: (checked: boolean) => {
          set('fridayOpen', checked);
          // Ticked, Friday starts from the main hours (W3); the owner then sets its own.
          if (checked && !values.fridayOpen) set('friday', { ...values.main });
        },
        legend: words.friday,
        range: range('friday', values.friday, { from: words.fridayFrom, to: words.to }, null),
        error: errorOf([FRIDAY]),
        closed: words.fridayClosed,
      },
      customise: {
        label: words.customise,
        run: () => {
          replace(toCustom(values));
        },
      },
    },
    days: {
      hint: words.customHint,
      rows: SHOWN_DAYS.map((index) => {
        const day = values.days[index] ?? { open: false, opensMinute: 480, closesMinute: 1080 };
        const name = dayName(index);
        return {
          key: index,
          name,
          state: day.open ? words.open : words.dayOff,
          toggle: {
            label: words.openOn({ day: name }),
            checked: day.open,
            disabled: form.isPending,
            run: (checked: boolean) => {
              if (checked) {
                // A day switched on takes the hours of the last open day edited, else the last open.
                const source =
                  (lastEdited !== null && values.days[lastEdited]?.open
                    ? values.days[lastEdited]
                    : undefined) ??
                  [...SHOWN_DAYS]
                    .reverse()
                    .map((other) => values.days[other])
                    .find((other) => other?.open) ??
                  values.main;
                set(`days.${String(index)}` as Path<Values>, {
                  open: true,
                  opensMinute: source.opensMinute,
                  closesMinute: source.closesMinute,
                });
                setLastEdited(index);
                return;
              }
              set(`days.${String(index)}.open` as Path<Values>, false);
            },
          },
          range: day.open
            ? range(
                `days.${String(index)}` as `days.${number}`,
                day,
                { from: words.from, to: words.to },
                index,
              )
            : null,
          error: errorOf([index]),
        };
      }),
      simple: {
        label: words.simple,
        run: () => {
          if (fitsSimple(values)) replace(toSimple(values));
          else setUnifying(true);
        },
      },
    },
    unify: {
      open: unifying,
      title: words.unify.title,
      description: words.unify.description,
      back: words.unify.back,
      confirm: words.unify.continue,
      stay: () => {
        setUnifying(false);
      },
      go: () => {
        setUnifying(false);
        replace(toSimple(values));
      },
    },
    noneOpen: noneOpen ? words.noneOpen : null,
    /** DI-2: the saved shifts the new week leaves outside every open day, said before sending. */
    outside:
      outside.length === 0
        ? null
        : {
            line: words.shiftOutside({
              name: listOf(
                outside.map((shift) => (english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr)),
              ),
            }),
            link: {
              label: words.shiftOutsideLink,
              run: () => {
                frame.leave(() => {
                  host.openSheet('shifts');
                });
              },
            },
          },
  };
}

export type HoursSheetView = ReturnType<typeof useHoursSheet>;
