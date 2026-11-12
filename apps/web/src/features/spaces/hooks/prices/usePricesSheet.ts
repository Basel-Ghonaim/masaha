import {
  MAX_PRICES,
  PRICE_AUDIENCES,
  PRICE_PERIODS,
  updateSpacePricesSchema,
  type UpdateSpacePricesRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError } from '@shared/errors';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import {
  nextPrice,
  pricesInput,
  pricesValues,
  samePrices,
  type PricesValues,
} from '../../services/pricesForm';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';

type PricePart = keyof PricesValues['prices'][number];

/** A price's field, by its row. */
const priceField = <Name extends PricePart>(index: number, name: Name) =>
  `prices.${String(index)}.${name}` as `prices.${number}.${Name}`;

const ROWS = Array.from({ length: MAX_PRICES }, (_, index) => index);

// The fields in the order the Sheet shows them: a refusal focuses the first it names.
const FIELDS: Path<PricesValues>[] = ROWS.flatMap((index) => [
  priceField(index, 'period'),
  priceField(index, 'audience'),
  priceField(index, 'shiftId'),
  priceField(index, 'labelAr'),
  priceField(index, 'amountAgorot'),
]);

/** The shift field's option for no shift: a select's value cannot be empty. */
const NO_SHIFT = 'none';

/**
 * «الأسعار المعلنة»'s Sheet, ready to render (R6–R9, S4): a row per price — «الفترة», «لمن»,
 * «الوردية» only while the space has saved shifts («بدون وردية» first), «المبلغ (₪)» and its removal —
 * up to forty; an empty section opens on one row, and «إضافة سعر» adds the next period not yet priced
 * (R7). A price with a custom label keeps it, shown and never edited, and sent back as it was. A
 * repeat is said on its row («هذا السعر مضاف من قبل»), an empty amount on its own. With no saved
 * shift, «أضف وردية» leads to the shifts' Sheet, asking first if the prices changed; with no row left,
 * a line says what saving so means. Prices as saved send nothing; a shift removed meanwhile is said
 * on its row and the space fetched again.
 */
export function usePricesSheet(host: SectionHost) {
  const copy = useCopy();
  const words = copy.spaces.editor.prices;
  const english = useLanguage() === 'en';
  const { place, space } = host;
  const sheet = host.sheet('prices');
  const scope = EDITOR_SCOPES[place];
  const client = useQueryClient();
  const save = useSaveGroup(place, space.id, 'prices', (request: UpdateSpacePricesRequest) =>
    scope.repository.updatePrices(space.id, request),
  );
  const valuesOf = (): PricesValues =>
    space.prices.length === 0 ? { prices: [nextPrice([])] } : pricesValues(space.prices);
  const lines = words.fieldErrors;
  const form = useServerForm<PricesValues, UpdateSpacePricesRequest>({
    schema: updateSpacePricesSchema,
    defaultValues: valuesOf(),
    fields: FIELDS,
    prepare: pricesInput,
    submit: async (request) => {
      if (space.updatedAt.prices !== null && samePrices(request, space.prices)) {
        toast(copy.spaces.editor.section.unchanged);
        sheet.close();
        return;
      }
      try {
        await save.mutateAsync(request);
        sheet.close();
      } catch (error) {
        // A shift removed meanwhile (422 on a row's shift): the space as it is, with its shifts.
        const refused = Object.keys(toAppError(error).errors ?? {});
        if (refused.some((field) => field.endsWith('.shiftId'))) {
          void client.invalidateQueries({ queryKey: scope.spaceKey(space.id) });
        }
        throw error;
      }
    },
    failureTitle: copy.spaces.editor.section.failureTitle({ section: sectionName('prices', copy) }),
    fieldLines: Object.fromEntries(
      ROWS.flatMap((index) => [
        [priceField(index, 'period'), { not_unique: lines.repeated }],
        [
          priceField(index, 'shiftId'),
          { not_unique: lines.repeated, invalid_choice: lines.shiftGone },
        ],
        [priceField(index, 'labelAr'), { not_unique: lines.repeated }],
        [priceField(index, 'amountAgorot'), lines.amount],
      ]),
    ) as ServerFormOptions<PricesValues, UpdateSpacePricesRequest>['fieldLines'],
    failureLines: meanwhileLines(place, copy),
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
  const { control, setValue, register, trigger, formState, getValues } = form.form;
  const list = useFieldArray({ control, name: 'prices' });
  const typed = useWatch({ control, name: 'prices' });

  const shifts = space.hours?.shifts ?? [];
  const shiftOptions = [
    { value: NO_SHIFT, label: words.noShift, lang: undefined },
    ...shifts.map((shift) => ({
      value: String(shift.id),
      label: english ? (shift.nameEn ?? shift.nameAr) : shift.nameAr,
      lang: english && shift.nameEn === null ? ('ar' as const) : undefined,
    })),
  ];

  /** A select of a row, ready to render: once the Sheet was sent, the row is checked again. */
  const select = (
    index: number,
    name: 'period' | 'audience' | 'shiftId',
    label: string,
    value: string,
    options: { value: string; label: string; lang?: 'ar' | 'en' }[],
  ) => {
    const path = priceField(index, name);
    return {
      label,
      value: name === 'shiftId' && value === '' ? NO_SHIFT : value,
      options,
      disabled: form.isPending,
      choose: (option: string) => {
        setValue(path, name === 'shiftId' && option === NO_SHIFT ? '' : option, {
          shouldDirty: true,
        });
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

  return {
    frame,
    hint: words.sheetHint,
    columns: {
      period: words.period,
      audience: words.audience,
      shift: shifts.length > 0 ? words.shift : null,
      amount: words.amount,
    },
    rows: list.fields.map((row, index) => {
      const price = typed[index] ?? row;
      const name = words.row({ position: index + 1 });
      const cell = (column: string) => words.cell({ column, row: name });
      const labelled = price.labelAr.trim() !== '';
      return {
        key: row.id,
        cell,
        /** A custom label, shown and kept, its period fixed with it. */
        label: labelled
          ? {
              text: english && price.labelEn.trim() !== '' ? price.labelEn : price.labelAr,
              lang: english && price.labelEn.trim() === '' ? ('ar' as const) : undefined,
              period: words.periodsView[price.period],
              error: form.errors[priceField(index, 'labelAr')],
            }
          : null,
        period: select(
          index,
          'period',
          words.period,
          price.period,
          PRICE_PERIODS.map((period) => ({ value: period, label: words.periods[period] })),
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
        ),
        shift:
          shifts.length > 0
            ? select(index, 'shiftId', words.shift, price.shiftId, shiftOptions)
            : null,
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
        list.append(nextPrice(getValues('prices')));
      },
    },
    addShift:
      shifts.length > 0
        ? null
        : {
            lead: words.addShiftLead,
            label: words.addShiftLink,
            run: () => {
              frame.leave(() => {
                host.openSheet(space.hours === null ? 'hours' : 'shifts');
              });
            },
          },
    noneLeft: list.fields.length === 0 ? words.noneLeft : null,
  };
}

export type PricesSheetView = ReturnType<typeof usePricesSheet>;
