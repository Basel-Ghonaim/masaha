import {
  stalenessSchema,
  type StalenessRequest,
  type StalenessThresholds,
} from '@masaha/shared/platform-settings';
import { useCopy } from '@shared/copy';
import { wholeNumberOf } from '@shared/lib';
import { createPlatformSettingsRepository } from '../../repository/platformSettingsRepository';
import { useAdminSettingsForm } from './useAdminSettingsForm';

const repository = createPlatformSettingsRepository();

/** The two thresholds as typed. */
type StalenessValues = { priceStalenessDays: string; stalenessDays: string };

const stalenessValues = (thresholds: StalenessThresholds): StalenessValues => ({
  priceStalenessDays: String(thresholds.priceStalenessDays),
  stalenessDays: String(thresholds.stalenessDays),
});

/** Each threshold as typed, Arabic-Indic digits read; anything else left for the schema to refuse. */
const stalenessInput = (values: StalenessValues) => ({
  priceStalenessDays: wholeNumberOf(values.priceStalenessDays),
  stalenessDays: wholeNumberOf(values.stalenessDays),
});

/**
 * «حداثة البيانات», ready to render: after how many days the prices, and the other data, are stale —
 * whole days from 1 to 365, refused in the card's words.
 */
export function useStalenessCard(saved: StalenessThresholds) {
  const words = useCopy().platformSettings.admin.staleness;
  const { frame, form } = useAdminSettingsForm<
    StalenessValues,
    StalenessRequest,
    StalenessThresholds
  >({
    card: 'staleness',
    title: words.title,
    description: words.description,
    saved,
    valuesOf: stalenessValues,
    schema: stalenessSchema,
    fields: ['priceStalenessDays', 'stalenessDays'],
    prepare: stalenessInput,
    fieldLines: { priceStalenessDays: words.errors, stalenessDays: words.errors },
    save: (request) => repository.saveStaleness(request),
  });

  return {
    frame,
    prices: {
      label: words.prices,
      binding: form.field('priceStalenessDays'),
      error: form.errors.priceStalenessDays,
    },
    other: {
      label: words.other,
      binding: form.field('stalenessDays'),
      error: form.errors.stalenessDays,
    },
  };
}
