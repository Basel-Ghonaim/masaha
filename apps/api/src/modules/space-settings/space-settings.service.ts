import type { SpaceSettings, UpdateSpaceSettingsRequest } from '@masaha/shared/space-settings';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { settingsChange } from './settingsChange.ts';
import { toSpaceSettings } from './space-settings.mapper.ts';
import {
  createSpaceSettingsRepository,
  type InitialSpaceSettings,
  type SettingsRow,
} from './space-settings.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  /**
   * Takes the space's lock (conventions §13): whether the space exists and is not soft-deleted. The
   * lock is `spaces`', a level above this module, so the composition root passes it in.
   */
  lockSpace: (spaceId: number, tx: Tx) => Promise<boolean>;
}

/**
 * A space's settings, one row per space (docs/backend/conventions.md › space-settings): the row's
 * creation, which the space's creation calls in its own transaction, and its owner's read and edit
 * (docs/api/api-contract.md §5, Settings (managed)). The read is one query with no lock: one
 * statement is never half of a change, and the managed boundary has already admitted the caller.
 */
export function createSpaceSettingsService({ runInTransaction, audit, lockSpace }: Dependencies) {
  const repository = createSpaceSettingsRepository();

  /** Every space has its settings row, created with it: a missing one is a fault, not a refusal. */
  function present(spaceId: number, row: SettingsRow | null): SettingsRow {
    if (!row) throw new Error(`The space ${String(spaceId)} has no settings row.`);
    return row;
  }

  return {
    /** The space's settings row, with these values; in the caller's transaction. */
    createFor(spaceId: number, settings: InitialSpaceSettings, tx: Tx): Promise<void> {
      return repository.create(spaceId, settings, tx);
    },

    /** The space's settings, whole; in the caller's transaction when given one. */
    async read(spaceId: number, tx?: Tx): Promise<SpaceSettings> {
      return toSpaceSettings(present(spaceId, await repository.find(spaceId, tx)));
    },

    /**
     * These spaces' settings, by space, in one query; in the caller's transaction when given one. A
     * space without its row (a fault) is left out, for the caller to report.
     */
    async settingsFor(spaceIds: readonly number[], tx?: Tx): Promise<Map<number, SpaceSettings>> {
      if (spaceIds.length === 0) return new Map();
      const rows = new Map(
        (await repository.findMany(spaceIds, tx)).map(({ spaceId, ...row }) => [spaceId, row]),
      );
      return new Map(
        spaceIds.flatMap((spaceId) => {
          const row = rows.get(spaceId);
          return row ? [[spaceId, toSpaceSettings(row)] as const] : [];
        }),
      );
    },

    /**
     * Edits the space's settings, in one transaction and in this order: the space's lock; `can()` on
     * the links read under it, so a link ended meanwhile still decides (finding 43); only the fields
     * the edit sets to a new value, `null` clearing the stay limit or the reminder; its audit entry.
     * An edit that changes nothing writes and audits nothing, and answers the settings as they are.
     */
    update(
      actor: Actor,
      space: LoadedSpace,
      edit: UpdateSpaceSettingsRequest,
    ): Promise<SpaceSettings> {
      return runInTransaction(async (tx) => {
        if (!(await lockSpace(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
        if (!can(actor, 'space.settings.manage', { links: await space.linksUnder(tx) })) {
          throw AppError.forbidden();
        }
        const current = present(space.id, await repository.find(space.id, tx));
        const { data, before, after } = settingsChange(current, edit);
        if (Object.keys(data).length === 0) return toSpaceSettings(current);

        const row = await repository.update(space.id, data, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'space.settingsEdited',
            entityType: 'space',
            entityId: space.id,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return toSpaceSettings(row);
      });
    },
  };
}

export type SpaceSettingsService = ReturnType<typeof createSpaceSettingsService>;
