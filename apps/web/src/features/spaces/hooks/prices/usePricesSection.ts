import {
  MAX_PRICES,
  PRICE_AUDIENCES,
  PRICE_PERIODS,
  updateSpacePricesSchema,
  type AdminSpace,
  type FactGroup,
  type Price,
  type UpdateSpacePricesRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toAppError } from '@shared/errors';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import type { EditorPlace } from '../../types/EditorPlace';
import {
  NEW_PRICE,
  pricesInput,
  pricesValues,
  samePrices,
  type PricesValues,
} from '../../services/pricesForm';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSectionFrame } from '../editor/useSectionFrame';

type PricePart = keyof PricesValues['prices'][number];

/** A price's field, by its row. */
const priceField = <Name extends PricePart>(index: number, name: Name) =>
  `prices.${String(index)}.${name}` as `prices.${number}.${Name}`;

const PRICE_ROWS = Array.from({ length: MAX_PRICES }, (_, index) => index);

// The fields in the order the section shows them: a refusal focuses the first it names.
const FIELDS: Path<PricesValues>[] = PRICE_ROWS.flatMap((index) => [
  priceField(index, 'period'),
  priceField(index, 'audience'),
  priceField(index, 'shiftId'),
  priceField(index, 'labelAr'),
  priceField(index, 'labelEn'),
  priceField(index, 'amountAgorot'),
]);

/** The shift field's option for no shift: a select's value cannot be empty. */
const NO_SHIFT = 'none';

/**
 * The editor's «الأسعار» section, ready to render: the prices, up to the contract's forty, each a
 * period, an audience, one of the space's saved shifts or none, a custom label (its Arabic before its
 * English) and an amount typed in shekels. A repeated price is refused on the field that would tell
 * it apart, and an amount empty, zero or not an amount on its own, before anything is sent. While the
 * space has no saved shift, or the opening hours have unsaved changes, a line above the rows says so,
 * the first with the way to the hours where the page gives one (`hoursLink`). A save sends nothing
 * when the prices are as the form was last filled from; a shift removed meanwhile is said on its row,
 * and the space is fetched again. On the owner's place, Packages & prices, the section is titled
 * «الأسعار المعلنة», with its own intro.
 */
export function usePricesSection({
  place,
  space,
  hoursUnsaved,
  hoursLink,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  hoursUnsaved: boolean;
  hoursLink: string | null;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const copy = useCopy();
  const scope = EDITOR_SCOPES[place];
  const { repository } = scope;
  const words = copy.spaces.editor.prices;
  const lines = words.fieldErrors;
  const section = copy.spaces.editor.section;
  const english = useLanguage() === 'en';
  const client = useQueryClient();
  const save = useSaveGroup(place, space.id, 'prices', (request: UpdateSpacePricesRequest) =>
    repository.updatePrices(space.id, request),
  );
  const [unchanged, setUnchanged] = useState(false);
  // The prices the form was last filled from: a save that changes nothing is judged against them.
  const filledFrom = useRef<Price[]>(space.prices);
  const saved = pricesValues(space.prices);
  const missing = space.updatedAt.prices === null;
  const fieldLines = Object.fromEntries(
    PRICE_ROWS.flatMap((index) => [
      [priceField(index, 'period'), { not_unique: lines.repeated }],
      [
        priceField(index, 'shiftId'),
        { not_unique: lines.repeated, invalid_choice: lines.shiftGone },
      ],
      [
        priceField(index, 'labelAr'),
        {
          not_unique: lines.repeated,
          required: lines.labelAr.required,
          too_long: lines.label.too_long,
        },
      ],
      [priceField(index, 'labelEn'), { too_long: lines.label.too_long }],
      [priceField(index, 'amountAgorot'), lines.amount],
    ]),
  ) as ServerFormOptions<PricesValues, UpdateSpacePricesRequest>['fieldLines'];
  const form = useServerForm<PricesValues, UpdateSpacePricesRequest>({
    schema: updateSpacePricesSchema,
    defaultValues: saved,
    fields: FIELDS,
    prepare: pricesInput,
    submit: async (request) => {
      if (!missing && samePrices(request, filledFrom.current)) {
        setUnchanged(true);
        filledFrom.current = space.prices;
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      try {
        const answer = await save.mutateAsync(request);
        filledFrom.current = answer.prices;
        form.form.reset(pricesValues(answer.prices));
      } catch (error) {
        // A shift removed meanwhile (422 on a row's shift): the space as it is, with its shifts.
        const refused = Object.keys(toAppError(error).errors ?? {});
        if (refused.some((field) => field.endsWith('.shiftId'))) {
          void client.invalidateQueries({ queryKey: scope.spaceKey(space.id) });
        }
        throw error;
      }
    },
    failureTitle: section.failureTitle({ section: copy.spaces.editor.sections.prices }),
    fieldLines,
    failureLines: meanwhileLines(place, copy),
  });
  const { control, formState, setValue, register, trigger } = form.form;
  const list = useFieldArray({ control, name: 'prices' });
  const typed = useWatch({ control, name: 'prices' });
  const pricesKey = JSON.stringify(space.prices);

  // An unchanged section follows the space as the server answers it.
  useEffect(() => {
    if (!form.form.formState.isDirty) {
      const fresh = JSON.parse(pricesKey) as Price[];
      filledFrom.current = fresh;
      form.form.reset(pricesValues(fresh));
    }
  }, [pricesKey, form.form]);

  const frame = useSectionFrame({
    place,
    space,
    group: 'prices',
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: formState.isDirty,
      discard: () => {
        filledFrom.current = space.prices;
        setUnchanged(false);
        form.form.reset(saved);
      },
      unchanged,
    },
    onDirtyChange,
  });

  const shifts = space.hours?.shifts ?? [];
  const shiftOptions = [
    { value: NO_SHIFT, label: words.noShift },
    ...shifts.map((shift) => ({
      value: String(shift.id),
      label: english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
      lang: english && shift.nameEn === null ? ('ar' as const) : undefined,
    })),
  ];

  /** A select of a row, ready to render: once the section was sent, the row is checked again. */
  const select = (
    index: number,
    name: 'period' | 'audience' | 'shiftId',
    label: string,
    value: string,
    options: { value: string; label: string; lang?: 'ar' | 'en' }[],
    disabled: boolean,
  ) => {
    const path = priceField(index, name);
    return {
      label,
      value: name === 'shiftId' && value === '' ? NO_SHIFT : value,
      options,
      disabled,
      choose: (option: string) => {
        const chosen = name === 'shiftId' && option === NO_SHIFT ? '' : option;
        setValue(path, chosen, { shouldDirty: true });
        // A repeat is told apart by the row's period, shift and label: each is checked again.
        if (formState.isSubmitted) {
          void trigger([
            priceField(index, 'period'),
            priceField(index, 'shiftId'),
            priceField(index, 'labelAr'),
          ]);
        }
      },
      error: form.errors[path],
      ref: register(path).ref,
    };
  };
  const full = list.fields.length >= MAX_PRICES;

  const owner = place === 'owner';
  return {
    frame,
    intro: owner ? words.publishedIntro : words.intro,
    notes: [
      ...(shifts.length === 0
        ? [
            {
              text: words.noShifts,
              link: hoursLink === null ? null : { label: words.noShiftsLink, href: hoursLink },
            },
          ]
        : []),
      ...(hoursUnsaved ? [{ text: words.hoursUnsaved, link: null }] : []),
    ],
    columns: {
      period: words.period,
      audience: words.audience,
      shift: words.shift,
      label: words.label,
      labelEn: words.labelEn,
      amount: words.amount,
      optional: copy.spaces.add.optional,
    },
    rows: list.fields.map((row, index) => {
      const price = typed[index] ?? row;
      return {
        key: row.id,
        label: words.row({ position: index + 1 }),
        period: select(
          index,
          'period',
          words.period,
          price.period,
          PRICE_PERIODS.map((period) => ({ value: period, label: words.periods[period] })),
          form.isPending,
        ),
        audience: select(
          index,
          'audience',
          words.audience,
          price.audience,
          PRICE_AUDIENCES.map((audience) => ({
            value: audience,
            label: words.audiences[audience],
          })),
          form.isPending,
        ),
        shift: select(
          index,
          'shiftId',
          words.shift,
          price.shiftId,
          shiftOptions,
          shifts.length === 0 || form.isPending,
        ),
        labelAr: {
          label: words.label,
          binding: form.field(priceField(index, 'labelAr')),
          error: form.errors[priceField(index, 'labelAr')],
        },
        labelEn: {
          label: words.labelEn,
          placeholder: words.labelEnPlaceholder,
          binding: form.field(priceField(index, 'labelEn')),
          error: form.errors[priceField(index, 'labelEn')],
        },
        amount: {
          label: words.amount,
          binding: form.field(priceField(index, 'amountAgorot')),
          error: form.errors[priceField(index, 'amountAgorot')],
        },
        remove: {
          label: words.remove({ position: index + 1 }),
          disabled: form.isPending,
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
        list.append({ ...NEW_PRICE });
      },
    },
  };
}
