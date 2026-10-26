import { SUBSCRIPTION_BILLINGS } from '@masaha/shared/packages';
import { PRICE_AUDIENCES, type Shift } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useServerForm } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import {
  LIMIT_NAMES,
  sheetInput,
  sheetSchema,
  type SheetRequest,
  type SheetValues,
} from '../../services/sheetRequest';

type Chips<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  /** Any chip's value, as the chips hand it; a value that is not one of them changes nothing. */
  choose: (value: string) => void;
};

const isOf =
  <T extends string>(values: readonly T[]) =>
  (value: string): value is T =>
    values.some((one) => one === value);
const isAudience = isOf(PRICE_AUDIENCES);
const isBilling = isOf(SUBSCRIPTION_BILLINGS);

/**
 * The subscription sheet's form (the one form pattern): what it holds (`SheetValues`), checked with
 * the contract's schemas as the two requests (`sheetSchema`), each field's error at the path the
 * server names; and «مخصّص»'s terms, ready to render (DI-52): the name, prefilled, the audience and
 * the billing as chips, the price or the rate by the billing, the four optional limits, the shift
 * when the space has any, and the reason, required. `submit` sends the requests.
 */
export function useSheetForm({
  newCustomer,
  name,
  phone,
  startsOn,
  choice,
  shifts,
  renewalOfId,
  submit,
}: {
  newCustomer: boolean;
  name: string;
  phone: string;
  startsOn: string;
  choice: string;
  shifts: Shift[] | null;
  renewalOfId?: number;
  submit: (request: SheetRequest) => Promise<unknown>;
}) {
  const copy = useCopy();
  const words = copy.desk.sheet;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  // The schema reads who is new once: an opening is one customer.
  const [schema] = useState(() => sheetSchema(newCustomer));

  const form = useServerForm<SheetValues, SheetRequest>({
    schema,
    defaultValues: {
      name,
      phone,
      choice,
      startsOn,
      custom: {
        name: words.custom.defaultName,
        audience: 'GENERAL',
        billing: 'FIXED',
        priceAgorot: '',
        shiftId: '',
        endsOn: '',
        totalDays: '',
        daysPerWeek: '',
        hoursPerDay: '',
        totalHours: '',
        reason: '',
      },
      payment: { amountAgorot: 0, method: 'CASH' },
    },
    fields: [
      'name',
      'phone',
      'startsOn',
      'custom.name',
      'custom.priceAgorot',
      ...LIMIT_NAMES.map((limit) => `custom.${limit}` as const),
      'custom.endsOn',
      'custom.reason',
      'payment.amountAgorot',
    ],
    prepare: (values) => sheetInput(values, { newCustomer, renewalOfId }),
    submit,
    failureTitle: words.done.failed,
    fieldLines: {
      phone: { not_unique: copy.errors.PHONE_TAKEN },
      // A reason left blank is a reason missing, not a short one.
      'custom.reason': { too_short: copy.validation.required },
      'payment.amountAgorot': { out_of_range: copy.desk.money.amountZero },
    },
    failureLines: copy.desk.refusals,
  });

  const { control, setValue } = form.form;
  const [audience, billing, shiftId] = useWatch({
    control,
    name: ['custom.audience', 'custom.billing', 'custom.shiftId'],
  });
  const chips = <T extends string>(
    label: string,
    value: T,
    labels: Record<T, string>,
    values: readonly T[],
    set: (value: string) => void,
  ): Chips<T> => ({
    label,
    value,
    options: values.map((one) => ({ value: one, label: labels[one] })),
    choose: set,
  });
  const shiftOptions =
    shifts === null || shifts.length === 0
      ? null
      : [
          { value: '', label: copy.desk.visit.noShift },
          ...shifts.map((shift) => ({
            value: String(shift.id),
            label: language === 'en' ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
          })),
        ];

  const custom = {
    title: words.custom.title,
    name: {
      label: words.custom.name,
      field: form.field('custom.name'),
      error: form.errors['custom.name'],
    },
    audience: chips(
      words.custom.audience,
      audience,
      words.custom.audiences,
      PRICE_AUDIENCES,
      (value) => {
        if (isAudience(value)) setValue('custom.audience', value);
      },
    ),
    billing: chips(
      words.custom.billing,
      billing,
      words.custom.billings,
      SUBSCRIPTION_BILLINGS,
      (value) => {
        if (isBilling(value)) setValue('custom.billing', value);
      },
    ),
    price: {
      label: billing === 'FIXED' ? words.custom.price : words.custom.rate,
      field: form.field('custom.priceAgorot'),
      error: form.errors['custom.priceAgorot'],
    },
    limits: {
      label: words.custom.limits,
      items: LIMIT_NAMES.map((limit) => ({
        key: limit,
        label: words.custom.limitNames[limit],
        field: form.field(`custom.${limit}`),
        error: form.errors[`custom.${limit}`],
      })),
    },
    shift:
      shiftOptions === null
        ? null
        : {
            label: words.custom.shift,
            value: shiftId,
            options: shiftOptions,
            choose: (value: string) => {
              setValue('custom.shiftId', value);
            },
          },
    reason: {
      label: words.custom.reason,
      field: form.field('custom.reason'),
      error: form.errors['custom.reason'],
    },
  };

  return { form, custom };
}

/** «مخصّص»'s terms, ready to render. */
export type CustomTermsView = ReturnType<typeof useSheetForm>['custom'];
