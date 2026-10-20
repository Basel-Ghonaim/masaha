import { VISIT_ROUNDINGS, type SpaceSettings } from '@masaha/shared/space-settings';
import { useCopy } from '@shared/copy';
import { wholeNumberOf } from '@shared/lib';
import { useWatch } from 'react-hook-form';
import { roundingExample } from '../../services/roundingExample';
import { useSettingsCard } from '../card/useSettingsCard';

type Rounding = (typeof VISIT_ROUNDINGS)[number];

type PricingValues = {
  visitRounding: Rounding;
  /** The N of "up after N minutes", as typed. */
  visitRoundingMinutes: string;
  visitCapAtDayPrice: boolean;
  visitStudentPrices: boolean;
};

function pricingValues(settings: SpaceSettings): PricingValues {
  return {
    visitRounding: settings.visitRounding,
    visitRoundingMinutes:
      settings.visitRoundingMinutes === null ? '' : String(settings.visitRoundingMinutes),
    visitCapAtDayPrice: settings.visitCapAtDayPrice,
    visitStudentPrices: settings.visitStudentPrices,
  };
}

/** The request the card makes: the minutes only for "up after N minutes", `null` for the others. */
function pricingInput(values: PricingValues) {
  return {
    visitRounding: values.visitRounding,
    visitRoundingMinutes:
      values.visitRounding === 'UP_AFTER_MINUTES'
        ? wholeNumberOf(values.visitRoundingMinutes)
        : null,
    visitCapAtDayPrice: values.visitCapAtDayPrice,
    visitStudentPrices: values.visitStudentPrices,
  };
}

/**
 * The «تسعير الزيارات» card, ready to render: how a visit's stay is rounded — up after N minutes,
 * the minutes enabled only for that rule, its unit and an example following N; to the nearest half
 * hour; or by the minute — then the day price's cap and the student prices. The rule and its minutes
 * are one choice, sent together whenever either changed.
 */
export function usePricingCard({
  spaceId,
  settings,
}: {
  spaceId: number;
  settings: SpaceSettings;
}) {
  const words = useCopy().spaceSettings.pricing;
  const { frame, form } = useSettingsCard<PricingValues>({
    spaceId,
    settings,
    id: 'pricing',
    title: words.title,
    description: words.description,
    valuesOf: pricingValues,
    fields: ['visitRounding', 'visitRoundingMinutes', 'visitCapAtDayPrice', 'visitStudentPrices'],
    prepare: pricingInput,
    fieldLines: { visitRoundingMinutes: words.fieldErrors.minutes },
    together: [['visitRounding', 'visitRoundingMinutes']],
  });
  const { control, setValue } = form.form;
  const values = useWatch({ control }) as PricingValues;
  const upAfter = values.visitRounding === 'UP_AFTER_MINUTES';
  const minutes = wholeNumberOf(values.visitRoundingMinutes);
  const counted = typeof minutes === 'number' && minutes >= 1 && minutes <= 59 ? minutes : null;

  const toggle = (name: 'visitCapAtDayPrice' | 'visitStudentPrices', label: string) => ({
    label,
    checked: values[name],
    disabled: form.isPending,
    toggle: (checked: boolean) => {
      setValue(name, checked, { shouldDirty: true });
    },
  });

  return {
    frame,
    pricesLink: words.pricesLink,
    rounding: {
      label: words.rounding,
      value: values.visitRounding,
      disabled: form.isPending,
      choose: (chosen: string) => {
        const rounding = VISIT_ROUNDINGS.find((one) => one === chosen);
        if (rounding !== undefined) setValue('visitRounding', rounding, { shouldDirty: true });
      },
      upAfter: {
        label: words.upAfter,
        minutes: {
          label: words.minutesLabel,
          binding: { ...form.field('visitRoundingMinutes'), disabled: form.isPending || !upAfter },
          error: upAfter ? form.errors.visitRoundingMinutes : undefined,
          unit: words.minutesUnit({ count: counted ?? 0 }),
        },
        example: upAfter && counted !== null ? roundingExample(counted, words) : null,
      },
      half: { label: words.half, hint: words.halfHint },
      minute: { label: words.minute, hint: words.minuteHint },
    },
    cap: toggle('visitCapAtDayPrice', words.cap),
    students: toggle('visitStudentPrices', words.students),
  };
}
