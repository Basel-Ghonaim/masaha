import {
  MAX_SHIFTS,
  updateSpaceHoursSchema,
  type AdminSpace,
  type FactGroup,
  type SpaceHours,
  type UpdateSpaceHoursRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { useServerForm, type ServerForm, type ServerFormOptions } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import type { EditorPlace } from '../../types/EditorPlace';
import { settledClock } from '../../services/clockTime';
import {
  DAY_KEYS,
  SHOWN_DAYS,
  daysNotCovering,
  firstOpenDay,
  hoursInput,
  hoursValues,
  sameHours,
  type HoursValues,
} from '../../services/hoursForm';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSectionFrame } from '../editor/useSectionFrame';

type DayTime = 'opensMinute' | 'closesMinute';
type ShiftPart = 'nameAr' | 'nameEn' | 'startsMinute' | 'endsMinute';

/** A day's time field, by the contract's day index. */
const dayField = <Name extends DayTime>(index: number, name: Name) =>
  `days.${String(index)}.${name}` as `days.${number}.${Name}`;
/** A shift's field, by its row. */
const shiftField = <Name extends ShiftPart>(index: number, name: Name) =>
  `shifts.${String(index)}.${name}` as `shifts.${number}.${Name}`;
/** A shift as a whole: where the rule "inside an open day" refuses it. */
const shiftItem = (index: number) => `shifts.${String(index)}` as `shifts.${number}`;

const SHIFT_ROWS = Array.from({ length: MAX_SHIFTS }, (_, index) => index);

// The fields in the order the section shows them: a refusal focuses the first it names.
const FIELDS: Path<HoursValues>[] = [
  ...SHOWN_DAYS.flatMap((index) => [
    dayField(index, 'opensMinute'),
    dayField(index, 'closesMinute'),
  ]),
  ...SHIFT_ROWS.flatMap((index) => [
    shiftField(index, 'nameAr'),
    shiftField(index, 'nameEn'),
    shiftField(index, 'startsMinute'),
    shiftField(index, 'endsMinute'),
    shiftItem(index),
  ]),
];

/** A time field, ready to render: its text rewritten as `HH:MM` once it is left. */
type TimeField = {
  label: string;
  placeholder: string;
  binding: ReturnType<ServerForm<HoursValues, UpdateSpaceHoursRequest>['field']>;
  error?: string;
  helper?: string;
};

/**
 * The editor's «ساعات العمل» section, ready to render: the week, Saturday first, each day open or
 * closed with its two times, a copy of the first open day's hours to every open day, and the shifts,
 * up to the contract's ten, each keeping its id. A shift outside every open day is refused on it
 * before anything is sent; one that fits some open days only names the days it does not apply on. A
 * shift a saved price uses cannot be removed. A save sends nothing when the hours are as the form was
 * last filled from; a removed shift still in use (409), or a shift removed meanwhile (422 on its id),
 * is said, and the space is fetched again.
 */
export function useHoursSection({
  place,
  space,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const copy = useCopy();
  const scope = EDITOR_SCOPES[place];
  const { repository } = scope;
  const words = copy.spaces.editor.hours;
  const section = copy.spaces.editor.section;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const client = useQueryClient();
  const save = useSaveGroup(place, space.id, 'hours', (request: UpdateSpaceHoursRequest) =>
    repository.updateHours(space.id, request),
  );
  const [unchanged, setUnchanged] = useState(false);
  // The hours the form was last filled from: a save that changes nothing is judged against them.
  const filledFrom = useRef(space.hours);
  const saved = hoursValues(space.hours);
  const missing = space.updatedAt.hours === null;
  const fieldLines = Object.fromEntries([
    ...DAY_KEYS.flatMap((_, index) => [
      [dayField(index, 'opensMinute'), words.fieldErrors.opens],
      [dayField(index, 'closesMinute'), words.fieldErrors.closes],
    ]),
    ...SHIFT_ROWS.flatMap((index) => [
      [shiftField(index, 'nameAr'), words.fieldErrors.nameAr],
      [shiftField(index, 'nameEn'), words.fieldErrors.nameEn],
      [shiftField(index, 'startsMinute'), words.fieldErrors.opens],
      [shiftField(index, 'endsMinute'), words.fieldErrors.closes],
    ]),
  ]) as ServerFormOptions<HoursValues, UpdateSpaceHoursRequest>['fieldLines'];
  const form = useServerForm<HoursValues, UpdateSpaceHoursRequest>({
    schema: updateSpaceHoursSchema,
    defaultValues: saved,
    fields: FIELDS,
    prepare: hoursInput,
    submit: async (request) => {
      if (!missing && sameHours(request, filledFrom.current)) {
        setUnchanged(true);
        filledFrom.current = space.hours;
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      try {
        const answer = await save.mutateAsync(request);
        filledFrom.current = answer.hours;
        form.form.reset(hoursValues(answer.hours));
      } catch (error) {
        // A shift still in use (409), or one removed meanwhile (422 on its id): the space as it is.
        const refused = toAppError(error);
        const shiftGone = Object.keys(refused.errors ?? {}).some(
          (field) => field.startsWith('shifts.') && field.endsWith('.id'),
        );
        if (refused.status === 409 || shiftGone) {
          void client.invalidateQueries({ queryKey: scope.spaceKey(space.id) });
        }
        throw error;
      }
    },
    failureTitle: section.failureTitle({ section: copy.spaces.editor.sections.hours }),
    fieldLines,
    failureLines: {
      ...meanwhileLines(place, copy),
      conflict: words.inUse409,
      validation: words.shiftsChanged,
    },
  });
  const { control, formState, setValue, getValues } = form.form;
  const list = useFieldArray({ control, name: 'shifts' });
  const days = useWatch({ control, name: 'days' });
  const shifts = useWatch({ control, name: 'shifts' });
  const values: HoursValues = { days, shifts };
  const hoursKey = JSON.stringify(space.hours);

  // An unchanged section follows the space as the server answers it.
  useEffect(() => {
    if (!form.form.formState.isDirty) {
      const fresh = JSON.parse(hoursKey) as SpaceHours | null;
      filledFrom.current = fresh;
      form.form.reset(hoursValues(fresh));
    }
  }, [hoursKey, form.form]);

  const frame = useSectionFrame({
    place,
    space,
    group: 'hours',
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: formState.isDirty,
      discard: () => {
        filledFrom.current = space.hours;
        setUnchanged(false);
        form.form.reset(saved);
      },
      unchanged,
    },
    onDirtyChange,
  });

  const dayName = (index: number) => words.days[DAY_KEYS[index] ?? 'saturday'];
  const first = firstOpenDay(values);

  /** A time field's bindings: once left, a time it can read is rewritten as `HH:MM`. */
  const timeField = (
    path: `days.${number}.${DayTime}` | `shifts.${number}.${'startsMinute' | 'endsMinute'}`,
    end: boolean,
    label: string,
  ): TimeField => {
    const binding = form.field(path);
    return {
      label,
      placeholder: words.timeExample,
      binding: {
        ...binding,
        onBlur: (event) => {
          const typed = getValues(path);
          const settled = settledClock(typed, { end });
          if (settled !== typed) setValue(path, settled, { shouldDirty: true });
          return binding.onBlur(event);
        },
      },
      error: form.errors[path],
    };
  };

  const savedShiftIds = new Set(space.hours?.shifts.map(({ id }) => id) ?? []);
  const priced = new Set(space.prices.map(({ shiftId }) => shiftId));
  const full = list.fields.length >= MAX_SHIFTS;
  const listOfDays = new Intl.ListFormat(language, { type: 'conjunction' });

  return {
    frame,
    copyAll: {
      label: words.copyAll,
      disabled: first === null || form.isPending,
      run: () => {
        const current = getValues();
        const from = firstOpenDay(current);
        if (from === null) return;
        const source = current.days[from];
        if (source === undefined) return;
        current.days.forEach((day, index) => {
          if (!day.open) return;
          setValue(dayField(index, 'opensMinute'), source.opensMinute, { shouldDirty: true });
          setValue(dayField(index, 'closesMinute'), source.closesMinute, { shouldDirty: true });
        });
      },
    },
    hint: first === null ? words.noOpenDay : words.copyHint({ day: dayName(first) }),
    days: SHOWN_DAYS.map((index) => {
      const open = days[index]?.open ?? false;
      const name = dayName(index);
      return {
        key: index,
        name,
        state: open ? words.open : words.closed,
        toggle: {
          label: words.openOn({ day: name }),
          checked: open,
          disabled: form.isPending,
          run: (checked: boolean) => {
            setValue(`days.${String(index)}.open` as `days.${number}.open`, checked, {
              shouldDirty: true,
            });
          },
        },
        opens: open ? timeField(dayField(index, 'opensMinute'), false, words.from) : null,
        closes: open ? timeField(dayField(index, 'closesMinute'), true, words.to) : null,
      };
    }),
    shifts: {
      title: words.shifts,
      hint: words.shiftsHint,
      rows: list.fields.map((row, index) => {
        const id = shifts[index]?.id ?? null;
        const inUse = id !== null && savedShiftIds.has(id) && priced.has(id);
        const notOn = daysNotCovering(values, index);
        // The rule "inside an open day" refuses the shift as a whole: said on its end.
        const outside =
          form.codes[shiftItem(index)] === 'out_of_range'
            ? first === null
              ? words.fieldErrors.noneOpen
              : words.fieldErrors.outside
            : undefined;
        const ends = timeField(shiftField(index, 'endsMinute'), true, words.to);
        return {
          key: row.id,
          label: words.shift({ position: index + 1 }),
          nameAr: {
            label: words.nameAr,
            binding: form.field(shiftField(index, 'nameAr')),
            error: form.errors[shiftField(index, 'nameAr')],
          },
          nameEn: {
            label: words.nameEn,
            optional: copy.spaces.add.optional,
            binding: form.field(shiftField(index, 'nameEn')),
            error: form.errors[shiftField(index, 'nameEn')],
          },
          starts: timeField(shiftField(index, 'startsMinute'), false, words.from),
          ends: {
            ...ends,
            error: ends.error ?? outside,
            helper:
              notOn.length === 0
                ? undefined
                : words.notOn({ days: listOfDays.format(notOn.map(dayName)) }),
          },
          remove: {
            label: words.removeShiftNamed({ position: index + 1 }),
            text: words.removeShift,
            disabled: form.isPending || inUse,
            reason: inUse ? words.inUse : null,
            run: () => {
              list.remove(index);
            },
          },
        };
      }),
      add: {
        label: words.addShift,
        disabled: full || form.isPending,
        reason: full ? words.shiftLimit : null,
        run: () => {
          const current = getValues();
          const from = firstOpenDay(current);
          const range = from === null ? undefined : current.days[from];
          list.append({
            id: null,
            nameAr: '',
            nameEn: '',
            startsMinute: range?.opensMinute ?? '08:00',
            endsMinute: range?.closesMinute ?? '18:00',
          });
        },
      },
    },
  };
}
