import { gazaClockOf, type DomainErrorCode } from '@masaha/shared/core';
import type {
  CorrectPriceRequest,
  CorrectSubscriptionRequest,
  SubscriptionState,
  SubscriptionStatus,
} from '@masaha/shared/subscriptions';
import type { Logger } from 'pino';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import type { AuditValues, AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace, type SpaceAction } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import { calendarOf } from './calendar.ts';
import { currentSubscription } from './currentSubscription.ts';
import { progressWithout, subscriptionWarnings } from './limits.ts';
import { subscriptionChange } from './subscriptionChange.ts';
import { toSubscriptionState } from './subscriptions.mapper.ts';
import {
  createSubscriptionsRepository,
  type CheckInRow,
  type LockedSubscription,
  type NewCheckIn,
  type OpenCheckIn,
  type SubscriptionCheckIn,
  type SubscriptionToCreate,
} from './subscriptions.repository.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  audit: AuditWriter;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
  logger: Logger;
  /** The one clock (conventions §11). */
  now: () => Date;
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

/**
 * A new subscription as its audit entry records it: its customer, the package it copies and the one it
 * renews, its terms and dates, and a typed price's reason (else `null`); not its space, the entry's
 * own, nor its key.
 */
function createdValues(subscription: SubscriptionToCreate): AuditValues {
  return {
    customerId: subscription.customerId,
    packageId: subscription.packageId,
    renewalOfId: subscription.renewalOfId,
    name: subscription.name,
    startsOn: subscription.startsOn,
    endsOn: subscription.endsOn,
    totalDays: subscription.totalDays,
    daysPerWeek: subscription.daysPerWeek,
    hoursPerDay: subscription.hoursPerDay,
    totalHours: subscription.totalHours,
    billing: subscription.billing,
    priceAgorot: subscription.priceAgorot,
    audience: subscription.audience,
    shiftId: subscription.shiftId,
    reason: subscription.priceTyped?.reason ?? null,
  };
}

/** How many check-ins one run of the auto check-out closes at most; the next run continues. */
const AUTO_CHECKOUT_BATCH = 500;

/**
 * A customer's subscriptions and their check-ins (docs/backend/conventions.md › the front desk): the
 * subscriptions' states and their creation for the desk, the read `occupancy` composes *present*
 * from, and the auto check-out of the check-ins.
 */
export function createSubscriptionsService({
  runInTransaction,
  audit,
  spaces,
  spaceSettings,
  logger,
  now,
}: Dependencies) {
  const repository = createSubscriptionsRepository();

  /**
   * Opens a write of one subscription, in its transaction: the space's lock, `can()` of the action on
   * the links read under it (a link ended meanwhile still decides), then the subscription's row
   * (`FOR UPDATE`), not the space's → `not_found`. Answers its terms.
   */
  async function lockSubscription(
    actor: Actor,
    space: LoadedSpace,
    subscriptionId: number,
    action: SpaceAction,
    tx: Tx,
  ) {
    if (!(await spaces.lock(space.id, tx))) throw AppError.notFound(undefined, 'Space not found');
    if (!can(actor, action, { links: await space.linksUnder(tx) })) throw AppError.forbidden();
    if (!(await repository.lockIn(space.id, subscriptionId, tx))) {
      throw AppError.notFound(undefined, 'Subscription not found');
    }
    return repository.termsOf(subscriptionId, tx);
  }

  /** Opens a correction (`lockSubscription`); one ended early is `SUBSCRIPTION_ENDED`. */
  async function lockForCorrection(
    actor: Actor,
    space: LoadedSpace,
    subscriptionId: number,
    action: SpaceAction,
    tx: Tx,
  ) {
    const terms = await lockSubscription(actor, space, subscriptionId, action, tx);
    if (terms.ended) throw AppError.conflict('SUBSCRIPTION_ENDED');
    return terms;
  }

  /** The subscription's state as of now, in the caller's transaction. */
  async function stateNow(spaceId: number, subscriptionId: number, tx: Tx) {
    const [state] = await statesOf(spaceId, { ids: [subscriptionId] }, now(), tx);
    if (!state) throw new Error(`The subscription ${String(subscriptionId)} is not the space's.`);
    return state;
  }

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
     * Locks the space's subscription's row (`FOR UPDATE`), after the space's lock: its id, its
     * customer and the one that renewed it, or `null` when it is not the space's.
     */
    lockIn(spaceId: number, id: number, tx: Tx): Promise<LockedSubscription | null> {
      return repository.lockIn(spaceId, id, tx);
    },

    /** The space's subscription made with this idempotency key, in the caller's transaction. */
    findByKey(
      spaceId: number,
      key: string,
      tx: Tx,
    ): Promise<{ id: number; customerId: number } | null> {
      return repository.findByKey(spaceId, key, tx);
    },

    /**
     * Writes a subscription in the caller's transaction, audited `subscription.created` with its
     * terms, its package, the one it renews and a typed price's reason; or `refused` on a shift that
     * is not the space's, writing nothing.
     */
    async create(
      actorId: number,
      subscription: SubscriptionToCreate,
      tx: Tx,
    ): Promise<{ id: number } | { refused: 'shiftId' }> {
      const created = await repository.create(subscription, tx);
      if ('refused' in created) return created;
      await audit(
        {
          actorId,
          action: 'subscription.created',
          entityType: 'subscription',
          entityId: created.id,
          spaceId: subscription.spaceId,
          after: createdValues(subscription),
        },
        tx,
      );
      return created;
    },

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

    /**
     * The staff's correction of a subscription's limits, dates and name, in one transaction:
     * `lockForCorrection` (`subscriptions.manage`); only the fields set to a new value
     * (`subscriptionChange`), `null` clearing a limit or the end; an end before the start →
     * `out_of_range` on `endsOn`; nothing changed → nothing written; else audited
     * `subscription.corrected` with the changed fields before and after. Answers its state.
     */
    correct(
      actor: Actor,
      space: LoadedSpace,
      subscriptionId: number,
      edit: CorrectSubscriptionRequest,
    ): Promise<SubscriptionState> {
      return runInTransaction(async (tx) => {
        const current = await lockForCorrection(
          actor,
          space,
          subscriptionId,
          'subscriptions.manage',
          tx,
        );
        const { data, before, after } = subscriptionChange(current, edit);
        if (Object.keys(data).length === 0) return stateNow(space.id, subscriptionId, tx);
        const startsOn = data.startsOn === undefined ? current.startsOn : data.startsOn;
        const endsOn = data.endsOn === undefined ? current.endsOn : data.endsOn;
        if (startsOn !== null && endsOn !== null && endsOn < startsOn) {
          throw AppError.validation({ endsOn: ['out_of_range'] });
        }
        await repository.correct(subscriptionId, data, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'subscription.corrected',
            entityType: 'subscription',
            entityId: subscriptionId,
            spaceId: space.id,
            before,
            after,
          },
          tx,
        );
        return stateNow(space.id, subscriptionId, tx);
      });
    },

    /**
     * The owner's correction of a subscription's price and billing, in one transaction:
     * `lockForCorrection` (`subscriptions.correctPrice`); the same billing and price → nothing
     * written; else both, recorded as a price typed by the owner with the reason, audited
     * `subscription.priceCorrected`. A fixed price below what was paid is the database's refusal
     * (`PRICE_BELOW_PAID`). Answers its state.
     */
    correctPrice(
      actor: Actor,
      space: LoadedSpace,
      subscriptionId: number,
      { billing, priceAgorot, reason }: CorrectPriceRequest,
    ): Promise<SubscriptionState> {
      return runInTransaction(async (tx) => {
        const current = await lockForCorrection(
          actor,
          space,
          subscriptionId,
          'subscriptions.correctPrice',
          tx,
        );
        if (current.billing === billing && current.priceAgorot === priceAgorot) {
          return stateNow(space.id, subscriptionId, tx);
        }
        await repository.correctPrice(
          subscriptionId,
          { billing, priceAgorot, byId: actor.id, reason },
          tx,
        );
        await audit(
          {
            actorId: actor.id,
            action: 'subscription.priceCorrected',
            entityType: 'subscription',
            entityId: subscriptionId,
            spaceId: space.id,
            before: { billing: current.billing, priceAgorot: current.priceAgorot },
            after: { billing, priceAgorot, reason },
          },
          tx,
        );
        return stateNow(space.id, subscriptionId, tx);
      });
    },

    /**
     * Ends a subscription early («إنهاء الاشتراك», decision 5), in one transaction:
     * `lockSubscription` (`subscriptions.manage`); one already ended answered as it is, writing
     * nothing; else its end becomes today — its start, if it has not started; never later than its
     * end was — with who ended it and when, audited `subscription.ended`. No payment, refund or
     * proration; an open check-in on it stays open. It is `EXPIRED` from then (S5).
     */
    end(actor: Actor, space: LoadedSpace, subscriptionId: number): Promise<SubscriptionState> {
      return runInTransaction(async (tx) => {
        const terms = await lockSubscription(
          actor,
          space,
          subscriptionId,
          'subscriptions.manage',
          tx,
        );
        if (terms.ended) return stateNow(space.id, subscriptionId, tx);
        const endedAt = now();
        const today = gazaClockOf(endedAt).date;
        let endsOn = terms.startsOn !== null && terms.startsOn > today ? terms.startsOn : today;
        if (terms.endsOn !== null && terms.endsOn < endsOn) endsOn = terms.endsOn;
        await repository.end(subscriptionId, { endsOn, endedAt, endedById: actor.id }, tx);
        await audit(
          {
            actorId: actor.id,
            action: 'subscription.ended',
            entityType: 'subscription',
            entityId: subscriptionId,
            spaceId: space.id,
            before: { endsOn: terms.endsOn },
            after: { endsOn, endedAt: endedAt.toISOString() },
          },
          tx,
        );
        return stateNow(space.id, subscriptionId, tx);
      });
    },

    /** The space's check-in made with this idempotency key, in the caller's transaction. */
    findCheckInByKey(spaceId: number, key: string, tx: Tx): Promise<CheckInRow | null> {
      return repository.findCheckInByKey(spaceId, key, tx);
    },

    /**
     * What a check-in on the space's subscription warns of at `at` (`subscriptionWarnings`), in the
     * caller's transaction: its state by the function's counts, and whether today is counted
     * already. With `withoutId`, a retry's, that check-in is left out (`progressWithout`), so the
     * retry answers the warnings its first request did.
     */
    async limitWarnings(
      spaceId: number,
      subscriptionId: number,
      at: Date,
      withoutId: number | null,
      tx: Tx,
    ): Promise<DomainErrorCode[]> {
      const now = calendarOf(at);
      const [row] = await repository.statesIn(spaceId, { ids: [subscriptionId] }, now, tx);
      if (!row) throw new Error(`The subscription ${String(subscriptionId)} is not the space's.`);
      const { checkedInToday, own } = await repository.attendanceOf(
        subscriptionId,
        now.today,
        withoutId,
        tx,
      );
      let counted = row;
      if (own) {
        const before = progressWithout(toSubscriptionState(row, now.today).progress, own, now);
        counted = {
          ...row,
          days_used: before.daysUsed,
          days_this_week: before.daysThisWeek,
          minutes_used: before.minutesUsed,
          minutes_today: before.minutesToday,
        };
      }
      return subscriptionWarnings(toSubscriptionState(counted, now.today), { checkedInToday });
    },

    /**
     * Writes a subscriber's check-in in the caller's transaction, audited `checkIn.checkedIn` with
     * its subscription and customer.
     */
    async checkIn(actorId: number, checkIn: NewCheckIn, tx: Tx): Promise<CheckInRow> {
      const created = await repository.createCheckIn(checkIn, tx);
      await audit(
        {
          actorId,
          action: 'checkIn.checkedIn',
          entityType: 'checkIn',
          entityId: created.id,
          spaceId: checkIn.spaceId,
          after: { subscriptionId: checkIn.subscriptionId, customerId: checkIn.customerId },
        },
        tx,
      );
      return created;
    },

    /** Every check-in of the space's subscription, the earliest first, then by id. */
    checkInsOf(spaceId: number, subscriptionId: number): Promise<SubscriptionCheckIn[]> {
      return repository.checkInsOf(spaceId, subscriptionId);
    },

    /** The subscription that renewed this one of the space, or `null` while none has. */
    renewedBy(spaceId: number, subscriptionId: number): Promise<number | null> {
      return repository.renewedBy(spaceId, subscriptionId);
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
