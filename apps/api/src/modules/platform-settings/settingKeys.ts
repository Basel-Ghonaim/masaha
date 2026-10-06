import { z } from 'zod';

import { VisitRounding } from '../../generated/prisma/enums.ts';

// The typed key catalogue of the platform's settings (docs/backend/conventions.md §9): each key the
// API reads, and the schema its stored value is validated with when it is read. So far only the
// keys a space's creation and the admin's spaces list read.

/**
 * The defaults a new space's settings are copied from (conventions › New-space defaults). The
 * rounding minutes belong to the "up after N minutes" rule, and only to it.
 */
export const newSpaceDefaultsSchema = z
  .object({
    autoCheckoutAtClosing: z.boolean(),
    visitRounding: z.enum(VisitRounding),
    visitRoundingMinutes: z.int().min(1).max(59).nullable(),
    visitCapAtDayPrice: z.boolean(),
  })
  .refine(
    ({ visitRounding, visitRoundingMinutes }) =>
      (visitRounding === 'UP_AFTER_MINUTES') === (visitRoundingMinutes !== null),
    { path: ['visitRoundingMinutes'], message: 'set exactly for the UP_AFTER_MINUTES rule' },
  );

export type NewSpaceDefaults = z.infer<typeof newSpaceDefaultsSchema>;

/** A number of days, after which a fact group is stale. */
const days = z.int().positive();

export const SETTING_KEYS = {
  newSpaceDefaults: newSpaceDefaultsSchema,
  /** Every fact group but the prices. */
  stalenessDays: days,
  priceStalenessDays: days,
} as const;

export type SettingKey = keyof typeof SETTING_KEYS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_KEYS)[K]>;
