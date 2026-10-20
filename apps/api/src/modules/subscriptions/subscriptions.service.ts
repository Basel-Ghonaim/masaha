import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { createSubscriptionsRepository, type OpenCheckIn } from './subscriptions.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
}

/** How many check-ins one run of the auto check-out closes at most; the next run continues. */
const AUTO_CHECKOUT_BATCH = 500;

/**
 * A customer's subscriptions and their check-ins (docs/backend/conventions.md › the front desk). So
 * far the read `occupancy` composes *present* from, and the auto check-out of the check-ins.
 */
export function createSubscriptionsService({
  runInTransaction,
  audit,
  spaces,
  spaceSettings,
}: Dependencies) {
  const repository = createSubscriptionsRepository();
  return {
    /** The space's open subscription check-ins, the earliest first, then by id. */
    openCheckInsIn(spaceId: number, tx?: Tx): Promise<OpenCheckIn[]> {
      return repository.openCheckInsIn(spaceId, tx);
    },

    /** How many check-ins are open at each of these spaces, in one query; none is absent. */
    openCheckInCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      return repository.openCheckInCountsIn(spaceIds);
    },

    /**
     * The auto check-out of check-ins (data model › Auto check-out), as `visits` closes its visits:
     * every open check-in due by `at`, by its space's week and settings now, the earliest first, up
     * to a batch, each in its own transaction under its row's lock while still open, at its due
     * time; audited `checkIn.autoCheckedOut` with no actor.
     */
    async autoCheckOut(at: Date): Promise<{ checkIns: number; remaining: number }> {
      const open = await repository.openEverywhere();
      const spaceIds = [...new Set(open.map(({ spaceId }) => spaceId))];
      const [weeks, settings] = await Promise.all([
        spaces.weeksFor(spaceIds),
        spaceSettings.settingsFor(spaceIds),
      ]);
      const due = open.flatMap((checkIn) => {
        const rules = settings.get(checkIn.spaceId);
        if (!rules) return [];
        const dueAt = spaces.autoCheckoutDue({
          checkedInAt: checkIn.checkedInAt,
          week: weeks.get(checkIn.spaceId) ?? null,
          autoCheckoutAtClosing: rules.autoCheckoutAtClosing,
          maxStayMinutes: rules.maxStayMinutes,
        });
        return dueAt && dueAt <= at ? [{ checkIn, dueAt }] : [];
      });

      let closed = 0;
      for (const { checkIn, dueAt } of due.slice(0, AUTO_CHECKOUT_BATCH)) {
        const done = await runInTransaction(async (tx) => {
          if (!(await repository.lockOpen(checkIn.id, tx))) return false;
          await repository.closeAuto(checkIn.id, dueAt, tx);
          await audit(
            {
              actorId: null,
              action: 'checkIn.autoCheckedOut',
              entityType: 'checkIn',
              entityId: checkIn.id,
              spaceId: checkIn.spaceId,
              after: { checkedOutAt: dueAt.toISOString() },
            },
            tx,
          );
          return true;
        });
        if (done) closed += 1;
      }
      return { checkIns: closed, remaining: Math.max(due.length - AUTO_CHECKOUT_BATCH, 0) };
    },
  };
}

export type SubscriptionsService = ReturnType<typeof createSubscriptionsService>;
