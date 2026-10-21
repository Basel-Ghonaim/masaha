import type { SubscriptionState, SubscriptionStatus } from '@masaha/shared/subscriptions';
import type { Logger } from 'pino';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { calendarOf } from './calendar.ts';
import { currentSubscription } from './currentSubscription.ts';
import { toSubscriptionState } from './subscriptions.mapper.ts';
import { createSubscriptionsRepository, type OpenCheckIn } from './subscriptions.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
  logger: Logger;
}

/** Each customer's current subscription, from their states. */
function currentByCustomer(states: readonly SubscriptionState[]): Map<number, SubscriptionState> {
  const byCustomer = new Map<number, SubscriptionState[]>();
  for (const state of states) {
    byCustomer.set(state.customerId, [...(byCustomer.get(state.customerId) ?? []), state]);
  }
  return new Map(
    [...byCustomer].flatMap(([customerId, theirs]) => {
      const current = currentSubscription(theirs);
      return current ? [[customerId, current] as const] : [];
    }),
  );
}

/** How many check-ins one run of the auto check-out closes at most; the next run continues. */
const AUTO_CHECKOUT_BATCH = 500;

/**
 * A customer's subscriptions and their check-ins (docs/backend/conventions.md › the front desk). So
 * far the subscriptions' states, the read `occupancy` composes *present* from, and the auto check-out
 * of the check-ins.
 */
export function createSubscriptionsService({
  runInTransaction,
  audit,
  spaces,
  spaceSettings,
  logger,
}: Dependencies) {
  const repository = createSubscriptionsRepository();

  /**
   * The space's subscriptions, of one customer, of these customers or with these ids when given, each with its status,
   * progress and amount due at `at`: one query, the attendance counted by the database's
   * `subscription_usage`, the status by the pure rule. The latest started first, then by id desc.
   */
  async function statesOf(
    spaceId: number,
    which: { customerId?: number; customerIds?: readonly number[]; ids?: readonly number[] },
    at: Date,
    tx?: Tx,
  ): Promise<SubscriptionState[]> {
    const now = calendarOf(at);
    const rows = await repository.statesIn(spaceId, which, now, tx);
    return rows.map((row) => toSubscriptionState(row, now.today));
  }

  return {
    /** The space's subscriptions with their states (above). */
    statesOf,

    /**
     * The current subscription of each of these customers of the space at `at`
     * (`currentSubscription`), by customer; a customer with none is absent. One query.
     */
    async currentOf(
      spaceId: number,
      customerIds: readonly number[],
      at: Date,
    ): Promise<Map<number, SubscriptionState>> {
      if (customerIds.length === 0) return new Map();
      return currentByCustomer(await statesOf(spaceId, { customerIds }, at));
    },

    /**
     * The customers list's subscription filters as ids (conventions §5): of the space's customers,
     * those whose current subscription has this status, this kind and this package. One query of
     * the space's subscriptions (a compact row each, read into memory: the status is a pure rule);
     * `NONE` answers the customers with a subscription, to exclude. No filter: nothing to apply.
     */
    async customerIdsBy(
      spaceId: number,
      {
        status,
        kind,
        packageId,
      }: {
        status?: SubscriptionStatus | undefined;
        kind?: 'PACKAGE' | 'CUSTOM' | 'NONE' | undefined;
        packageId?: number | undefined;
      },
      at: Date,
    ): Promise<{ include?: number[]; exclude?: number[] }> {
      if (status === undefined && kind === undefined && packageId === undefined) return {};
      const current = currentByCustomer(await statesOf(spaceId, {}, at));
      if (kind === 'NONE') {
        return status === undefined ? { exclude: [...current.keys()] } : { include: [] };
      }
      const include = [...current.values()].filter(
        (state) =>
          (status === undefined || state.status === status) &&
          (kind === undefined || (kind === 'PACKAGE') === (state.packageId !== null)) &&
          (packageId === undefined || state.packageId === packageId),
      );
      return { include: include.map(({ customerId }) => customerId) };
    },

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
     * time; audited `checkIn.autoCheckedOut` with no actor. One that cannot be closed is logged and
     * the next one still is; the run counts them in `failed`, and throws only when it cannot run.
     */
    async autoCheckOut(at: Date): Promise<{ checkIns: number; remaining: number; failed: number }> {
      const open = await repository.openEverywhere();
      const spaceIds = [...new Set(open.map(({ spaceId }) => spaceId))];
      const [weeks, settings] = await Promise.all([
        spaces.weeksFor(spaceIds),
        spaceSettings.settingsFor(spaceIds),
      ]);
      let failed = 0;
      const notClosed = (stayId: number, err: unknown) => {
        logger.error({ err, job: 'subscriptions.autoCheckOut', stayId }, 'stay not closed');
        failed += 1;
      };
      const due = open.flatMap((checkIn) => {
        const rules = settings.get(checkIn.spaceId);
        if (!rules) {
          notClosed(
            checkIn.id,
            new Error(`The space ${String(checkIn.spaceId)} has no settings row.`),
          );
          return [];
        }
        const dueAt = spaces.autoCheckoutDue({
          checkedInAt: checkIn.checkedInAt,
          week: weeks.get(checkIn.spaceId) ?? null,
          autoCheckoutAtClosing: rules.autoCheckoutAtClosing,
          maxStayMinutes: rules.maxStayMinutes,
        });
        return dueAt <= at ? [{ checkIn, dueAt }] : [];
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
        }).catch((err: unknown) => {
          notClosed(checkIn.id, err);
          return false;
        });
        if (done) closed += 1;
      }
      return {
        checkIns: closed,
        remaining: Math.max(due.length - AUTO_CHECKOUT_BATCH, 0),
        failed,
      };
    },
  };
}

export type SubscriptionsService = ReturnType<typeof createSubscriptionsService>;
