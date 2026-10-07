import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';

import type { RunInTransaction, Tx } from '../../../db/index.ts';
import type { AuditValues, AuditWriter } from '../../../shared/audit/index.ts';
import { can, isVerified, type Actor, type LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { PlatformSettingsService } from '../../platform-settings/index.ts';
import {
  createSpaceRepository,
  type GroupDateColumn,
  type LockedSpace,
} from '../space/space.repository.ts';
import { createSpaceView } from '../space/spaceView.ts';
import { createFactsReader } from './facts.ts';

/** What every group's service is given, and passes on to the save path. */
export interface GroupEditDependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  platformSettings: PlatformSettingsService;
  /** The one clock (conventions §11): the group's new date. */
  now: () => Date;
}

/** Each group's date column. */
export const DATE_COLUMNS: Record<FactGroup, GroupDateColumn> = {
  profile: 'profileUpdatedAt',
  hours: 'hoursUpdatedAt',
  prices: 'pricesUpdatedAt',
  amenities: 'amenitiesUpdatedAt',
  contacts: 'contactsUpdatedAt',
};

/** What a change of one group records: the group before and after, or nothing to write. */
export type GroupChange = { before: AuditValues; after: AuditValues } | null;

/**
 * One group's change under the space's lock: it may read and write the group with `tx`, at `at`,
 * the group's new date, and answers what it records, or `null` to write nothing.
 */
export type GroupStep = (tx: Tx, space: LockedSpace, at: Date) => Promise<GroupChange>;

/**
 * The one way a space's fact group changes, whether it is saved or confirmed (decision F1): in one
 * transaction, the space is locked, so the state a change replaces is the one it read, and a
 * soft-deleted one is not found; `can()` decides from the space's links whether the actor may
 * (the admin while it is unverified, else its owner, decision S9); then the change, the group's new
 * date and its audit entry, `space.<group><verb>`. One logic, whichever router calls it.
 */
export function createGroupEdit({
  runInTransaction,
  audit,
  platformSettings,
  now,
}: GroupEditDependencies) {
  const repository = createSpaceRepository();
  const view = createSpaceView(now);
  const readFacts = createFactsReader();

  return async function editGroup(
    actor: Actor,
    space: LoadedSpace,
    group: FactGroup,
    verb: 'Edited' | 'Confirmed',
    step: GroupStep,
  ): Promise<AdminSpace> {
    // Read before the transaction opens: inside it, a read without `tx` waits on a second
    // connection while the transaction holds one.
    const thresholds = await platformSettings.stalenessThresholds();
    return runInTransaction(async (tx) => {
      const current = await repository.lock(space.id, tx);
      if (!current || current.deletedAt) throw AppError.notFound(undefined, 'Space not found');
      const action = group === 'profile' ? 'space.profile.update' : 'space.facts.update';
      if (!can(actor, action, space)) throw AppError.forbidden();

      const at = now();
      const change = await step(tx, current, at);
      if (!change) {
        return view(current, isVerified(space), thresholds, await readFacts(space.id, tx));
      }

      const updated = await repository.update(space.id, { [DATE_COLUMNS[group]]: at }, tx);
      await audit(
        {
          actorId: actor.id,
          action: `space.${group}${verb}`,
          entityType: 'space',
          entityId: space.id,
          spaceId: space.id,
          before: change.before,
          after: change.after,
        },
        tx,
      );
      return view(updated, isVerified(space), thresholds, await readFacts(space.id, tx));
    });
  };
}
