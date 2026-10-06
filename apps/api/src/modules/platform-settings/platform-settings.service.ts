import type { Tx } from '../../db/index.ts';
import { createPlatformSettingsRepository } from './platform-settings.repository.ts';
import {
  SETTING_KEYS,
  type NewSpaceDefaults,
  type SettingKey,
  type SettingValue,
} from './settingKeys.ts';

/** The thresholds after which a fact group is stale, in days. */
export interface StalenessThresholds {
  stalenessDays: number;
  priceStalenessDays: number;
}

/**
 * The platform's settings: values only, no rules (docs/backend/conventions.md §9). The module that
 * consumes a value applies it. A setting the seed did not write, or whose value fails its schema,
 * is a fault, not a default: reading it throws, so a write that needed it rolls back.
 */
export function createPlatformSettingsService() {
  const repository = createPlatformSettingsRepository();

  async function read<const K extends SettingKey>(
    keys: readonly K[],
    tx?: Tx,
  ): Promise<{ [P in K]: SettingValue<P> }> {
    const stored = new Map((await repository.findMany(keys, tx)).map((row) => [row.key, row]));
    return Object.fromEntries(
      keys.map((key) => {
        const row = stored.get(key);
        if (!row) throw new Error(`The platform setting ${key} is missing.`);
        return [key, SETTING_KEYS[key].parse(row.value)];
      }),
    ) as { [P in K]: SettingValue<P> };
  }

  return {
    /** What a new space's settings are copied from. */
    async newSpaceDefaults(tx?: Tx): Promise<NewSpaceDefaults> {
      return (await read(['newSpaceDefaults'], tx)).newSpaceDefaults;
    },

    /** The staleness thresholds, in one query. */
    stalenessThresholds(tx?: Tx): Promise<StalenessThresholds> {
      return read(['stalenessDays', 'priceStalenessDays'], tx);
    },
  };
}

export type PlatformSettingsService = ReturnType<typeof createPlatformSettingsService>;
