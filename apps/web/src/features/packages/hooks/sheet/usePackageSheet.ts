import {
  createPackageSchema,
  SUBSCRIPTION_BILLINGS,
  type CreatePackageRequest,
  type SpacePackage,
} from '@masaha/shared/packages';
import { PRICE_AUDIENCES } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError } from '@shared/errors';
import { useServerForm } from '@shared/forms';
import { agorotOf } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useWatch, type Path } from 'react-hook-form';
import { priceLineOf, shiftNameOf, summaryOf } from '../../services/packageSummary';
import {
  LIMIT_NAMES,
  packageInput,
  valuesOf,
  type LimitName,
  type PackageValues,
} from '../../services/packageValues';
import type { ShiftChoice } from '../../types/ShiftChoice';
import { useSavePackage } from './useSavePackage';

// The fields in the order the sheet shows them: a refusal focuses the first it names.
const FIELDS: Path<PackageValues>[] = [
  'name',
  'validityDays',
  ...LIMIT_NAMES,
  'billing',
  'priceAgorot',
  'audience',
  'shiftId',
];

/** The shift chips' value for no shift: a chip's value cannot be empty. */
const NO_SHIFT = 'none';

/** A count as the summary words it: a whole number from 1, else none yet. */
const counted = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;

/**
 * The package sheet's form, mounted while the sheet is open, so each opening starts from the package
 * as it stands (`editing`, `null` for a new one): its name, its validity, the limits turned on, each
 * with its field, the billing with its amount labelled by it, the audience, and the space's shifts
 * as chips with «بدون وردية» first, or the line that there is none with the way to the hours
 * (`hoursLink`), or that they are loading (`shifts` `null`). The terms are checked in the browser by
 * the contract's schema, whole, and an edit sends them whole (S11). A summary follows what is typed.
 * Saved: the list has arrived again, the sheet closes (`close`) and a toast names the package. A
 * repeated name (409) lands on the name; a shift gone meanwhile (422) on the shift, and the space's
 * scope is fetched again, since its shifts are `spaces`'.
 */
export function usePackageSheet({
  spaceId,
  editing,
  shifts,
  hoursLink,
  close,
}: {
  spaceId: number;
  editing: SpacePackage | null;
  shifts: readonly ShiftChoice[] | null;
  hoursLink: string;
  close: () => void;
}) {
  const copy = useCopy();
  const words = copy.packages;
  const sheet = words.sheet;
  const lines = words.fieldErrors;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const client = useQueryClient();
  const save = useSavePackage(spaceId, editing);
  const form = useServerForm<PackageValues, CreatePackageRequest>({
    // The terms are sent whole, so an edit is checked as a new package is: no term may be cleared.
    schema: createPackageSchema,
    defaultValues: valuesOf(editing),
    fields: FIELDS,
    prepare: packageInput,
    submit: async (request) => {
      let saved: SpacePackage;
      try {
        saved = await save.mutateAsync(request);
      } catch (error) {
        // A shift removed meanwhile: the space's shifts are another capability's, under its scope.
        if (toAppError(error).errors?.shiftId !== undefined) {
          void client.invalidateQueries({ queryKey: ['space', spaceId] });
        }
        throw error;
      }
      close();
      toast(words.saved({ name: isolate(saved.name) }));
    },
    failureTitle: sheet.failed,
    fieldLines: {
      name: lines.name,
      validityDays: lines.count,
      totalDays: lines.count,
      daysPerWeek: { ...lines.count, ...lines.daysPerWeek },
      hoursPerDay: { ...lines.count, ...lines.hoursPerDay },
      totalHours: lines.count,
      priceAgorot: lines.amount,
      shiftId: lines.shift,
    },
    failureLines: words.refusals,
  });
  const { control, setValue } = form.form;
  const values = useWatch({ control }) as PackageValues;

  /** A limit's error: one turned on and left empty asks for its number, or to turn it off. */
  const limitError = (name: LimitName) =>
    form.codes[name] === 'invalid_format' && values[name].trim() === ''
      ? lines.limitEmpty
      : form.errors[name];

  const input = packageInput(values);
  const draft = {
    validityDays: counted(input.validityDays),
    totalDays: counted(input.totalDays),
    daysPerWeek: counted(input.daysPerWeek),
    hoursPerDay: counted(input.hoursPerDay),
    totalHours: counted(input.totalHours),
    audience: values.audience,
    shiftId: input.shiftId,
  };
  const agorot = agorotOf(values.priceAgorot);

  return {
    title: editing === null ? sheet.newTitle : sheet.editTitle,
    description: sheet.description,
    closeLabel: sheet.close,
    submit: form.submit,
    isPending: form.isPending,
    blocked: form.blocked,
    failure: form.failure,
    submitLabel: sheet.submit,
    name: { label: sheet.name, binding: form.field('name'), error: form.errors.name },
    validity: {
      label: sheet.validity,
      helper: sheet.validityHelp,
      binding: form.field('validityDays'),
      error: form.errors.validityDays,
    },
    limits: {
      label: sheet.limits,
      helper: sheet.limitsHelp,
      optional: sheet.optional,
      value: values.limits,
      disabled: form.isPending,
      options: LIMIT_NAMES.map((name) => ({ value: name, label: sheet.limitNames[name] })),
      choose: (chosen: string[]) => {
        const on = LIMIT_NAMES.filter((name) => chosen.includes(name));
        // A limit turned off clears its field, so turning it on again starts empty.
        for (const name of LIMIT_NAMES) {
          if (!on.includes(name)) setValue(name, '', { shouldDirty: true });
        }
        setValue('limits', on, { shouldDirty: true });
      },
      fields: LIMIT_NAMES.filter((name) => values.limits.includes(name)).map((name) => ({
        name,
        label: sheet.limitNames[name],
        binding: form.field(name),
        error: limitError(name),
      })),
    },
    billing: {
      label: sheet.billing,
      value: values.billing,
      disabled: form.isPending,
      options: SUBSCRIPTION_BILLINGS.map((billing) => ({
        value: billing,
        label: sheet.billings[billing],
      })),
      choose: (chosen: string) => {
        const billing = SUBSCRIPTION_BILLINGS.find((one) => one === chosen);
        // A single choice is always on one: a press on the chip already on changes nothing.
        if (billing !== undefined) setValue('billing', billing, { shouldDirty: true });
      },
    },
    amount: {
      label: sheet.amount[values.billing],
      binding: form.field('priceAgorot'),
      error: form.errors.priceAgorot,
    },
    audience: {
      label: sheet.audience,
      value: values.audience,
      disabled: form.isPending,
      options: PRICE_AUDIENCES.map((audience) => ({
        value: audience,
        label: sheet.audiences[audience],
      })),
      choose: (chosen: string) => {
        const audience = PRICE_AUDIENCES.find((one) => one === chosen);
        if (audience !== undefined) setValue('audience', audience, { shouldDirty: true });
      },
    },
    shift: {
      label: sheet.shift,
      error: form.errors.shiftId,
      state:
        shifts === null
          ? ({ kind: 'loading', text: sheet.shiftsLoading } as const)
          : shifts.length === 0
            ? ({
                kind: 'none',
                text: sheet.noShifts,
                link: { label: sheet.addShifts, href: hoursLink },
              } as const)
            : ({
                kind: 'chips',
                value: values.shiftId === '' ? NO_SHIFT : values.shiftId,
                disabled: form.isPending,
                options: [
                  { value: NO_SHIFT, label: sheet.noShift },
                  ...shifts.map((shift) => ({
                    value: String(shift.id),
                    label: shiftNameOf(shift, language),
                  })),
                ],
                choose: (chosen: string) => {
                  if (chosen === '') return;
                  setValue('shiftId', chosen === NO_SHIFT ? '' : chosen, { shouldDirty: true });
                },
              } as const),
    },
    summary: {
      label: sheet.summary,
      name: values.name.trim() === '' ? sheet.unnamed : values.name.trim(),
      terms: summaryOf(draft, shifts, words, language),
      price:
        typeof agorot === 'number' && agorot >= 1
          ? priceLineOf({ billing: values.billing, priceAgorot: agorot }, words, language)
          : sheet.noPrice,
    },
  };
}
