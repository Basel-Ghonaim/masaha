import { STALENESS_DAYS_MAX } from '@masaha/shared/platform-settings';
import { newSpaceDefaultsSchema } from '@masaha/shared/space-settings';
import { z } from 'zod';

// The typed key catalogue of the platform's settings (docs/backend/conventions.md §9): each key the
// API reads, and the schema its stored value is validated with when it is read.

/** A number of days, after which a fact group is stale. */
const days = z.int().min(1).max(STALENESS_DAYS_MAX);

/** The keys every database holds: the seed writes them, and a missing one is a fault. */
export const SETTING_KEYS = {
  newSpaceDefaults: newSpaceDefaultsSchema,
  /** Every fact group but the prices. */
  stalenessDays: days,
  priceStalenessDays: days,
} as const;

/**
 * The keys a database may lack: the seed writes the contact only when its environment gives one, so
 * a missing row reads `null`. Read in the form the seed writes (an email, an E.164 number), so a row
 * already stored never turns into a fault; the admin's save stores the normalised form.
 */
export const OPTIONAL_SETTING_KEYS = {
  contactEmail: z.email().nullable(),
  contactWhatsapp: z
    .string()
    .regex(/^\+[1-9][0-9]{7,14}$/)
    .nullable(),
} as const;

const CATALOGUE = { ...SETTING_KEYS, ...OPTIONAL_SETTING_KEYS };

export type SettingKey = keyof typeof CATALOGUE;
export type OptionalSettingKey = keyof typeof OPTIONAL_SETTING_KEYS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof CATALOGUE)[K]>;

/** The schema of a key's stored value. */
export function schemaOf<K extends SettingKey>(key: K): (typeof CATALOGUE)[K] {
  return CATALOGUE[key];
}

export function isOptional(key: SettingKey): key is OptionalSettingKey {
  return key in OPTIONAL_SETTING_KEYS;
}

export { newSpaceDefaultsSchema };
export type { NewSpaceDefaults } from '@masaha/shared/space-settings';
