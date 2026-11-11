import {
  MAX_SHIFTS,
  updateSpaceHoursSchema,
  type SpaceHours,
  type UpdateSpaceHoursRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError } from '@shared/errors';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import {
  daysNotCovering,
  newShift,
  sameShifts,
  shiftsInput,
  shiftsValues,
  type ShiftsValues,
} from '../../services/shiftsForm';
import { timeChoiceOf } from '../../services/timeOptions';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';

/** The Sheet's form: the shifts as chosen. */
type Values = ShiftsValues;

type ShiftPart = 'nameAr' | 'nameEn' | 'startsMinute' | 'endsMinute';
const shiftField = (index: number, part: ShiftPart) =>
  `shifts.${String(index)}.${part}` as `shifts.${number}.${ShiftPart}`;
const shiftItem = (index: number) => `shifts.${String(index)}` as `shifts.${number}`;
const ROWS = Array.from({ length: MAX_SHIFTS }, (_, index) => index);

// The fields in the order the Sheet shows them: a refusal focuses the first it names.
const FIELDS: Path<Values>[] = ROWS.flatMap((index) => [
  shiftField(index, 'nameAr'),
  shiftField(index, 'nameEn'),
  shiftField(index, 'startsMinute'),
  shiftField(index, 'endsMinute'),
  shiftItem(index),
]);

/** A day's key in the catalogue's week, by the contract's index. */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * «الورديات»'s Sheet, ready to render (S3, X1): a row per shift — its Arabic name, its English one
 * (optional), «من» and «إلى» from the half-hour lists — up to ten, a saved one keeping its id; with
 * none, one row to fill in. A shift lies inside one open day at least, a helper naming the days it
 * does not apply on; a repeated Arabic name is refused on its row. A shift a saved price uses, or on
 * the owner's page a package (SD5), cannot be removed, its row saying why; a removal the server still
 * refuses (409: something this page cannot see) is said in the Sheet, and the space fetched again.
 * The request is the saved week exactly as the space was last read when «حفظ» is pressed (S5), so a
 * week saved meanwhile is kept, with the new shifts; shifts as saved send nothing.
 */
export function useShiftsSheet(host: SectionHost, packageShifts: readonly number[]) {
  const copy = useCopy();
  const words = copy.spaces.editor.shifts;
  const english = useLanguage() === 'en';
  const { place, space } = host;
  const sheet = host.sheet('shifts');
  const scope = EDITOR_SCOPES[place];
  const client = useQueryClient();
  // The Sheet opens only once the hours are saved (DI-1).
  const hours: SpaceHours = space.hours ?? {
    days: Array.from({ length: 7 }, () => null),
    shifts: [],
  };
  const save = useSaveGroup(place, space.id, 'shifts', (request: UpdateSpaceHoursRequest) =>
    scope.repository.updateHours(space.id, request),
  );
  const valuesOf = (): Values => shiftsValues(hours);
  // The saved week as last read: the shifts are sent with it, never with the one read at opening.
  const week = useRef(hours.days);
  useEffect(() => {
    week.current = hours.days;
  });
  const lines = words.fieldErrors;
  const form = useServerForm<Values, UpdateSpaceHoursRequest>({
    schema: updateSpaceHoursSchema,
    defaultValues: valuesOf(),
    fields: FIELDS,
    prepare: (values) => shiftsInput(values, week.current),
    submit: async (request) => {
      if (sameShifts(request.shifts, hours)) {
        toast(copy.spaces.editor.section.unchanged);
        sheet.close();
        return;
      }
      try {
        await save.mutateAsync(request);
        sheet.close();
      } catch (error) {
        // A removed shift still in use (409), or one removed meanwhile (422 on its id).
        const refused = toAppError(error);
        if (refused.status === 409 || refused.errors !== undefined) {
          void client.invalidateQueries({ queryKey: scope.spaceKey(space.id) });
        }
        throw error;
      }
    },
    failureTitle: copy.spaces.editor.section.failureTitle({ section: sectionName('shifts', copy) }),
    fieldLines: Object.fromEntries(
      ROWS.flatMap((index) => [
        [shiftField(index, 'nameAr'), lines.nameAr],
        [shiftField(index, 'nameEn'), lines.nameEn],
        [shiftField(index, 'endsMinute'), { out_of_range: lines.after }],
        [shiftItem(index), { out_of_range: lines.outside }],
      ]),
    ) as ServerFormOptions<Values, UpdateSpaceHoursRequest>['fieldLines'],
    failureLines: {
      ...meanwhileLines(place, copy),
      conflict: words.inUse409,
      validation: words.shiftsChanged,
    },
  });
  useResetOnOpen(sheet.open, () => {
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
  const { control, setValue, formState } = form.form;
  const list = useFieldArray({ control, name: 'shifts' });
  const typed = useWatch({ control, name: 'shifts' });
  const used = new Set([
    ...space.prices.flatMap(({ shiftId }) => (shiftId === null ? [] : [shiftId])),
    ...packageShifts,
  ]);
  const listOfDays = new Intl.ListFormat(english ? 'en' : 'ar-u-nu-latn', { type: 'conjunction' });
  const full = list.fields.length >= MAX_SHIFTS;
  const set = (path: Path<Values>, minute: number) => {
    setValue(path, minute as never, { shouldDirty: true });
    if (formState.isSubmitted) void form.form.trigger(FIELDS);
  };

  return {
    frame,
    hint: words.hint,
    rows: list.fields.map((row, index) => {
      const shift = typed[index] ?? row;
      const notOn = daysNotCovering(hours.days, shift);
      const inUse = shift.id !== null && used.has(shift.id);
      return {
        key: row.id,
        legend: words.shift({ position: index + 1 }),
        nameAr: {
          label: words.nameAr,
          placeholder: words.placeholderAr,
          binding: form.field(shiftField(index, 'nameAr')),
          error: form.errors[shiftField(index, 'nameAr')],
        },
        nameEn: {
          label: words.nameEn,
          optional: copy.spaces.editor.section.optional,
          placeholder: words.placeholderEn,
          binding: form.field(shiftField(index, 'nameEn')),
          error: form.errors[shiftField(index, 'nameEn')],
        },
        starts: timeChoiceOf(
          words.from,
          shift.startsMinute,
          false,
          (minute) => {
            set(shiftField(index, 'startsMinute'), minute);
          },
          form.isPending,
        ),
        ends: {
          time: timeChoiceOf(
            words.to,
            shift.endsMinute,
            true,
            (minute) => {
              set(shiftField(index, 'endsMinute'), minute);
            },
            form.isPending,
          ),
          error: form.errors[shiftField(index, 'endsMinute')] ?? form.errors[shiftItem(index)],
          helper:
            notOn.length === 0
              ? undefined
              : words.notOn({
                  days: listOfDays.format(
                    notOn.map(
                      (day) => copy.spaces.editor.hours.week.dayNames[DAY_KEYS[day] ?? 'sat'],
                    ),
                  ),
                }),
        },
        remove: {
          label: words.remove({ position: index + 1 }),
          disabled: form.isPending || inUse,
          reason: inUse ? words.inUse : null,
          run: () => {
            list.remove(index);
          },
        },
      };
    }),
    add: {
      label: words.add,
      disabled: full || form.isPending,
      reason: full ? words.limit : null,
      run: () => {
        list.append(newShift(hours));
      },
    },
  };
}

export type ShiftsSheetView = ReturnType<typeof useShiftsSheet>;
