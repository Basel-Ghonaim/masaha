import {
  newSpaceDefaultsSchema,
  VISIT_ROUNDINGS,
  type NewSpaceDefaults,
} from '@masaha/shared/space-settings';
import { useCopy } from '@shared/copy';
import { wholeNumberOf } from '@shared/lib';
import { useWatch } from 'react-hook-form';
import { createPlatformSettingsRepository } from '../../repository/platformSettingsRepository';
import { useAdminSettingsForm } from './useAdminSettingsForm';

const repository = createPlatformSettingsRepository();

type Rounding = (typeof VISIT_ROUNDINGS)[number];

type DefaultsValues = {
  autoCheckoutAtClosing: boolean;
  visitRounding: Rounding;
  /** The N of "up after N minutes", as typed. */
  visitRoundingMinutes: string;
  visitCapAtDayPrice: boolean;
};

const defaultsValues = (defaults: NewSpaceDefaults): DefaultsValues => ({
  autoCheckoutAtClosing: defaults.autoCheckoutAtClosing,
  visitRounding: defaults.visitRounding,
  visitRoundingMinutes:
    defaults.visitRoundingMinutes === null ? '' : String(defaults.visitRoundingMinutes),
  visitCapAtDayPrice: defaults.visitCapAtDayPrice,
});

/** The minutes only for "up after N minutes", `null` for the others, as the contract asks. */
const defaultsInput = (values: DefaultsValues) => ({
  ...values,
  visitRoundingMinutes:
    values.visitRounding === 'UP_AFTER_MINUTES' ? wholeNumberOf(values.visitRoundingMinutes) : null,
});

/**
 * «الإعدادات الافتراضية للمساحات الجديدة», ready to render: the automatic check-out, the visit's
 * rounding — up after N minutes, its field shown only for that rule, its bounds and words the
 * owner's pricing card's (EC18); to the nearest half hour; by the minute — and the day price's cap.
 */
export function useDefaultsCard(saved: NewSpaceDefaults) {
  const copy = useCopy();
  const words = copy.platformSettings.admin.defaults;
  const { frame, form } = useAdminSettingsForm<DefaultsValues, NewSpaceDefaults, NewSpaceDefaults>({
    card: 'defaults',
    title: words.title,
    description: words.description,
    saved,
    valuesOf: defaultsValues,
    schema: newSpaceDefaultsSchema,
    fields: [
      'autoCheckoutAtClosing',
      'visitRounding',
      'visitRoundingMinutes',
      'visitCapAtDayPrice',
    ],
    prepare: defaultsInput,
    fieldLines: { visitRoundingMinutes: copy.spaceSettings.pricing.fieldErrors.minutes },
    save: (request) => repository.saveDefaults(request),
  });
  const { control, setValue } = form.form;
  const values = useWatch({ control }) as DefaultsValues;

  const toggle = (name: 'autoCheckoutAtClosing' | 'visitCapAtDayPrice', label: string) => ({
    label,
    checked: values[name],
    disabled: form.isPending,
    toggle: (checked: boolean) => {
      setValue(name, checked, { shouldDirty: true });
    },
  });

  return {
    frame,
    autoCheckout: toggle('autoCheckoutAtClosing', words.autoCheckout),
    rounding: {
      label: words.rounding,
      value: values.visitRounding,
      disabled: form.isPending,
      choose: (chosen: string) => {
        const rounding = VISIT_ROUNDINGS.find((one) => one === chosen);
        if (rounding !== undefined) setValue('visitRounding', rounding, { shouldDirty: true });
      },
      upAfter: words.upAfter,
      /** «بعد (دقائق)», only while «تقريب لأعلى…» is chosen. */
      minutes:
        values.visitRounding === 'UP_AFTER_MINUTES'
          ? {
              label: words.minutes,
              binding: form.field('visitRoundingMinutes'),
              error: form.errors.visitRoundingMinutes,
            }
          : null,
      half: words.half,
      minute: words.minute,
    },
    cap: toggle('visitCapAtDayPrice', words.cap),
  };
}
