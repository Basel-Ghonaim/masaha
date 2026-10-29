import type { PlatformContact, StalenessThresholds } from '@masaha/shared/platform-settings';
import { isDeepStrictEqual } from 'node:util';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import {
  createPlatformSettingsRepository,
  type StoredSetting,
} from './platform-settings.repository.ts';
import { settingsChange } from './settingsChange.ts';
import {
  isOptional,
  schemaOf,
  type NewSpaceDefaults,
  type SettingKey,
  type SettingValue,
} from './settingKeys.ts';

export type { StalenessThresholds };

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
}

type Values<K extends SettingKey> = { [P in K]: SettingValue<P> };

/** One of the admin's cards: its stored keys, and the card as their values (and back). */
interface Card<K extends SettingKey, C extends object> {
  action: string;
  keys: readonly K[];
  fromValues: (values: Values<K>) => C;
  toValues: (card: C) => Values<K>;
}

const NEW_SPACE_DEFAULTS: Card<'newSpaceDefaults', NewSpaceDefaults> = {
  action: 'platformSettings.newSpaceDefaultsEdited',
  keys: ['newSpaceDefaults'],
  fromValues: ({ newSpaceDefaults }) => newSpaceDefaults,
  toValues: (newSpaceDefaults) => ({ newSpaceDefaults }),
};

const STALENESS: Card<'stalenessDays' | 'priceStalenessDays', StalenessThresholds> = {
  action: 'platformSettings.stalenessEdited',
  keys: ['stalenessDays', 'priceStalenessDays'],
  fromValues: ({ stalenessDays, priceStalenessDays }) => ({ stalenessDays, priceStalenessDays }),
  toValues: ({ stalenessDays, priceStalenessDays }) => ({ stalenessDays, priceStalenessDays }),
};

const CONTACT: Card<'contactEmail' | 'contactWhatsapp', PlatformContact> = {
  action: 'platformSettings.contactEdited',
  keys: ['contactEmail', 'contactWhatsapp'],
  fromValues: ({ contactEmail, contactWhatsapp }) => ({
    email: contactEmail,
    whatsapp: contactWhatsapp,
  }),
  toValues: ({ email, whatsapp }) => ({ contactEmail: email, contactWhatsapp: whatsapp }),
};

/**
 * The platform's settings: values only, no rules (docs/backend/conventions.md §9). The module that
 * consumes a value applies it. A required setting the seed did not write, or any setting whose value
 * fails its schema, is a fault, not a default: reading it throws, so a write that needed it rolls
 * back. An optional setting (the contact) with no row reads `null`.
 */
export function createPlatformSettingsService({ runInTransaction, audit }: Dependencies) {
  const repository = createPlatformSettingsRepository();

  /** The rows' values by key, each parsed by its schema. */
  function parse<const K extends SettingKey>(
    keys: readonly K[],
    rows: readonly StoredSetting[],
  ): Values<K> {
    const stored = new Map(rows.map((row) => [row.key, row]));
    return Object.fromEntries(
      keys.map((key) => {
        const row = stored.get(key);
        if (!row) {
          if (isOptional(key)) return [key, null];
          throw new Error(`The platform setting ${key} is missing.`);
        }
        return [key, schemaOf(key).parse(row.value)];
      }),
    ) as Values<K>;
  }

  async function read<const K extends SettingKey>(keys: readonly K[], tx?: Tx): Promise<Values<K>> {
    return parse(keys, await repository.findMany(keys, tx));
  }

  /**
   * Saves a card whole, in one transaction (conventions §13): a row for each optional key that has
   * none, the card's rows locked by key, only its fields that change written and audited. A save
   * that changes nothing writes nothing and answers the card as it is.
   */
  function save<K extends SettingKey, C extends object>(
    card: Card<K, C>,
    actorId: number,
    next: C,
  ): Promise<C> {
    return runInTransaction(async (tx) => {
      await repository.ensure(card.keys.filter(isOptional), tx);
      const stored = parse(card.keys, await repository.lock(card.keys, tx));
      const change = settingsChange(card.fromValues(stored), next);
      if (!change) return card.fromValues(stored);

      const values = card.toValues(next);
      for (const key of card.keys) {
        if (!isDeepStrictEqual(values[key], stored[key])) {
          await repository.write(key, values[key], tx);
        }
      }
      await audit(
        {
          actorId,
          action: card.action,
          entityType: 'platformSettings',
          entityId: null,
          ...change,
        },
        tx,
      );
      return next;
    });
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

    /** The platform's contact, `null` while unset. */
    async contact(): Promise<PlatformContact> {
      return CONTACT.fromValues(await read(CONTACT.keys));
    },

    saveNewSpaceDefaults(actorId: number, value: NewSpaceDefaults): Promise<NewSpaceDefaults> {
      return save(NEW_SPACE_DEFAULTS, actorId, value);
    },

    saveStaleness(actorId: number, value: StalenessThresholds): Promise<StalenessThresholds> {
      return save(STALENESS, actorId, value);
    },

    saveContact(actorId: number, value: PlatformContact): Promise<PlatformContact> {
      return save(CONTACT, actorId, value);
    },
  };
}

export type PlatformSettingsService = ReturnType<typeof createPlatformSettingsService>;
