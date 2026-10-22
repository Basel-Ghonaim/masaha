import { addDays, gazaClockOf, type DomainErrorCode } from '@masaha/shared/core';
import type { Customer } from '@masaha/shared/customers';
import type {
  CheckOutVisitRequest,
  CustomerFile,
  CustomerPresence,
  CustomerRow,
  CustomersQuery,
  LeaveToCustomerRequest,
  NewSubscription,
  ReceivedPayment,
  ReceivePaymentRequest,
  SubscribeRequest,
  SubscriptionStatement,
  SubscriptionWithMoney,
  UnpaidVisit,
  VisitCheckOut,
} from '@masaha/shared/desk';
import type { PaymentRequest } from '@masaha/shared/payments';
import type { SubscriptionState } from '@masaha/shared/subscriptions';
import type {
  CheckInVisitRequest,
  DeskVisit,
  VisitCharge,
  WriteOffVisitRequest,
} from '@masaha/shared/visits';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import {
  can,
  type Actor,
  type LoadedSpace,
  type SpaceAction,
  type SpaceLink,
} from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import { derivedKey } from '../../shared/http/index.ts';
import type { CustomersService } from '../customers/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { PackageRow, PackagesService } from '../packages/index.ts';
import { allocate, ALLOCATION_MAX_ITEMS, type PaymentsService } from '../payments/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import {
  proposedStart,
  type SubscriptionsService,
  type SubscriptionToCreate,
} from '../subscriptions/index.ts';
import type { LockedVisit, VisitsService } from '../visits/index.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
  visits: VisitsService;
  subscriptions: SubscriptionsService;
  customers: CustomersService;
  payments: PaymentsService;
  occupancy: OccupancyService;
  packages: PackagesService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/** The keys a subscribe's payments may have taken: one per item an allocation pays at most. */
const derivedKeys = (key: string) =>
  Array.from({ length: ALLOCATION_MAX_ITEMS }, (_, index) => derivedKey(key, index));

/** How old the quote a check-out is priced at may be (the owner's bound, P6). */
const QUOTE_MAX_AGE_MS = 5 * 60_000;

/**
 * The front desk's orchestrations (docs/backend/conventions.md › the front desk): each spans the
 * desk's modules in one transaction, which takes the space's lock first.
 */
export function createDeskService({
  runInTransaction,
  spaces,
  spaceSettings,
  visits,
  subscriptions,
  customers,
  payments,
  occupancy,
  packages,
  now,
}: Dependencies) {
  /**
   * Opens a desk write: the space's lock, which also serialises the space's desk creates, then
   * `can()` of the write's action on the links read under it, so a link ended meanwhile still
   * decides (finding 43).
   */
  async function lockAtDesk(
    actor: Actor,
    space: LoadedSpace,
    tx: Tx,
    action: SpaceAction = 'attendance.record',
  ): Promise<readonly SpaceLink[]> {
    if (!(await spaces.lock(space.id, tx))) {
      throw AppError.notFound(undefined, 'Space not found');
    }
    const links = await space.linksUnder(tx);
    if (!can(actor, action, { links })) throw AppError.forbidden();
    return links;
  }

  /**
   * Locks a closed visit of the space whose money the desk finishes (`FOR UPDATE`, after the
   * space's lock): not the space's → `not_found`; still open → `conflict`, no code, as it is
   * settled at its check-out.
   */
  async function lockClosed(space: LoadedSpace, visitId: number, tx: Tx): Promise<LockedVisit> {
    const locked = await visits.lockIn(space.id, visitId, tx);
    if (!locked) throw AppError.notFound(undefined, 'Visit not found');
    if (locked.open)
      throw AppError.conflict(undefined, 'An open visit is settled at its check-out');
    return locked;
  }

  /**
   * The customer a visit's unpaid part is left to (data model › Unpaid visit), one rule for the
   * check-out and the later payment: a visit with a customer keeps it, and needs no phone, but a
   * phone that is not its customer's is refused (`VISIT_HAS_CUSTOMER`); a visit with none needs a
   * phone, whose customer is found among those not archived, or created with the name given, else
   * the visit's (which a visit with no customer has, by its `CHECK`).
   */
  async function customerFor(
    actor: Actor,
    space: LoadedSpace,
    { visit, visitorName }: LockedVisit,
    { phone, customerName }: { phone?: string | undefined; customerName?: string | undefined },
    tx: Tx,
  ): Promise<number> {
    if (visit.customer) {
      if (phone !== undefined && phone !== visit.customer.phone) {
        throw AppError.conflict('VISIT_HAS_CUSTOMER');
      }
      return visit.customer.id;
    }
    if (!phone) throw AppError.validation({ phone: ['required'] });
    const name = customerName ?? visitorName ?? '';
    return (
      await customers.findOrCreateByPhone({ spaceId: space.id, phone, name, actorId: actor.id }, tx)
    ).id;
  }

  /** What the locked visit was paid and still owes, read under its lock. */
  function balanceOf(space: LoadedSpace, { visit }: LockedVisit, tx: Tx) {
    return payments.balanceOfVisit(
      space.id,
      { id: visit.id, chargeAgorot: visit.charge?.amountAgorot ?? null },
      tx,
    );
  }

  /**
   * A new subscription's terms, from a package of the space (its end `validityDays` after its
   * start, both included), or typed at the desk by whoever may type a price (else
   * `PRICE_TYPING_NOT_ALLOWED`), its end as sent and never before its start, recorded with who typed
   * it and why.
   */
  function termsOf(
    actor: Actor,
    pack: PackageRow | null,
    { custom }: SubscribeRequest,
    startsOn: string,
    mayType: boolean,
  ): Omit<SubscriptionToCreate, 'spaceId' | 'customerId' | 'key' | 'renewalOfId' | 'startsOn'> {
    if (pack) {
      return {
        name: pack.name,
        totalDays: pack.totalDays,
        daysPerWeek: pack.daysPerWeek,
        hoursPerDay: pack.hoursPerDay,
        totalHours: pack.totalHours,
        billing: pack.billing,
        priceAgorot: pack.priceAgorot,
        audience: pack.audience,
        shiftId: pack.shiftId,
        packageId: pack.id,
        endsOn: addDays(startsOn, pack.validityDays - 1),
        priceTyped: null,
      };
    }
    if (!custom) throw AppError.validation({ packageId: ['invalid_choice'] });
    if (!mayType) throw AppError.forbidden('PRICE_TYPING_NOT_ALLOWED');
    if (custom.endsOn !== undefined && custom.endsOn < startsOn) {
      throw AppError.validation({ 'custom.endsOn': ['out_of_range'] });
    }
    return {
      name: custom.name,
      totalDays: custom.totalDays ?? null,
      daysPerWeek: custom.daysPerWeek ?? null,
      hoursPerDay: custom.hoursPerDay ?? null,
      totalHours: custom.totalHours ?? null,
      billing: custom.billing,
      priceAgorot: custom.priceAgorot,
      audience: custom.audience,
      shiftId: custom.shiftId ?? null,
      packageId: null,
      endsOn: custom.endsOn ?? null,
      priceTyped: { byId: actor.id, reason: custom.reason },
    };
  }

  /**
   * A subscription of the space with its state, what was paid on it and what it still owes, as of
   * `at`, in the caller's transaction (its customer's items, one query).
   */
  async function withMoney(
    space: LoadedSpace,
    { id, customerId }: { id: number; customerId: number },
    at: Date,
    tx?: Tx,
  ): Promise<SubscriptionWithMoney> {
    const [state] = await subscriptions.statesOf(space.id, { ids: [id] }, at, tx);
    if (!state) throw new Error(`The subscription ${String(id)} is not the space's.`);
    const items = await payments.itemBalances(space.id, customerId, at, tx);
    const money = items.find((item) => item.kind === 'SUBSCRIPTION' && item.id === id);
    return {
      ...state,
      paidAgorot: money?.paidAgorot ?? 0,
      balanceAgorot: money?.balanceAgorot ?? state.dueAgorot,
    };
  }

  /**
   * A subscribe's answer as of `at`, in the caller's transaction (a retry's too): the subscription
   * with its state and money, the payments given, and the customer's debt; and `CUSTOMER_HAS_DEBT`
   * while an item older than the subscription still owes (ADR 0010 rule 7).
   */
  async function subscribed(
    space: LoadedSpace,
    made: { id: number; customerId: number },
    allocated: NewSubscription['payments'],
    at: Date,
    tx: Tx,
  ): Promise<{ result: NewSubscription; warnings: DomainErrorCode[] }> {
    const subscription = await withMoney(space, made, at, tx);
    const items = await payments.itemBalances(space.id, made.customerId, at, tx);
    const balances = await payments.customerBalances(space.id, [made.customerId], at, tx);
    const olderDebt = items.some(
      (item) =>
        !(item.kind === 'SUBSCRIPTION' && item.id === made.id) && (item.balanceAgorot ?? 0) > 0,
    );
    return {
      result: {
        subscription,
        payments: allocated,
        debtAgorot: balances.get(made.customerId)?.debtAgorot ?? 0,
      },
      warnings: olderDebt ? ['CUSTOMER_HAS_DEBT'] : [],
    };
  }

  /**
   * A subscribe's payment (K3, the owner's decision 8): the customer's items that still owe, read
   * under the space's lock, oldest first, each paid at most its balance, the rest to the new
   * subscription (`allocate`); one payment per part, in that order, under the key derived from the
   * request's and the part's place, each checked by the ledger (above a fixed new price:
   * `PAYMENT_EXCEEDS_DUE`, the whole request undone). Answered in that order.
   */
  async function allocatePayment(
    actor: Actor,
    space: LoadedSpace,
    made: { id: number; customerId: number },
    key: string,
    { amountAgorot, ...payment }: PaymentRequest,
    at: Date,
    tx: Tx,
  ): Promise<NewSubscription['payments']> {
    const items = await payments.itemBalances(space.id, made.customerId, at, tx);
    const debts = items.flatMap(({ kind, id, balanceAgorot }) =>
      (kind === 'SUBSCRIPTION' && id === made.id) || balanceAgorot === null || balanceAgorot <= 0
        ? []
        : [{ item: kind === 'VISIT' ? { visitId: id } : { subscriptionId: id }, balanceAgorot }],
    );
    const { parts } = allocate(amountAgorot, debts, {
      subscriptionId: made.id,
    });
    const allocated: NewSubscription['payments'] = [];
    for (const [index, part] of parts.entries()) {
      const recorded = await payments.record(
        {
          spaceId: space.id,
          item: part.item,
          key: derivedKey(key, index),
          ...payment,
          amountAgorot: part.amountAgorot,
          recordedById: actor.id,
          receivedAt: at,
        },
        tx,
      );
      allocated.push({ item: part.item, payment: recorded });
    }
    return allocated;
  }

  /**
   * A payment on a subscription, under the space's lock, in this order: the subscription's row (`FOR
   * UPDATE`), not the space's → `invalid_choice` on `subscriptionId`; the payment this key recorded,
   * for another item → `conflict`, for this one a retry, answered with the sums as of now; then the
   * payment, which the ledger checks (above a fixed price: `PAYMENT_EXCEEDS_DUE`; a usage-based one
   * takes any amount, its credit). An ended or expired subscription, or an archived customer's,
   * still takes one: its debt is owed.
   */
  async function subscriptionPayment(
    actor: Actor,
    space: LoadedSpace,
    subscriptionId: number,
    key: string,
    payment: PaymentRequest,
    tx: Tx,
  ): Promise<ReceivedPayment> {
    const locked = await subscriptions.lockIn(space.id, subscriptionId, tx);
    if (!locked) throw AppError.validation({ subscriptionId: ['invalid_choice'] });
    const recorded = await payments.findByKey(space.id, key, tx);
    if (recorded && recorded.subscriptionId !== subscriptionId) {
      throw AppError.conflict(undefined, 'This idempotency key paid another item');
    }
    const at = now();
    const received =
      recorded?.payment ??
      (await payments.record(
        {
          spaceId: space.id,
          item: { subscriptionId },
          key,
          ...payment,
          recordedById: actor.id,
          receivedAt: at,
        },
        tx,
      ));
    const { paidAgorot, balanceAgorot, ...subscription } = await withMoney(space, locked, at, tx);
    return { visit: null, subscription, payment: received, paidAgorot, balanceAgorot };
  }

  /**
   * The time a check-out is priced at: the quote's the desk showed, at most five minutes old and
   * not in the future, else `out_of_range`; absent, now.
   */
  function pricedAt(checkedOutAt: string | undefined, requestedAt: Date): Date {
    if (checkedOutAt === undefined) return requestedAt;
    const quoted = new Date(checkedOutAt);
    const age = requestedAt.getTime() - quoted.getTime();
    if (age < 0 || age > QUOTE_MAX_AGE_MS) {
      throw AppError.validation({ checkedOutAt: ['out_of_range'] });
    }
    return quoted;
  }

  return {
    /**
     * Checks a visitor in, in one transaction: the space's lock and `can()`; the visit this key
     * already made, for a retry; else the visit, with the rates of its audience and shift as they
     * are now. Answers it with what the check-in warns of now (a retry counts the visit present),
     * which never refuses it.
     */
    checkInVisit(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      request: CheckInVisitRequest,
    ): Promise<{ visit: DeskVisit; warnings: DomainErrorCode[] }> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx);
        const checkedInAt = now();
        const warnings = await occupancy.checkInWarnings(space.id, checkedInAt, tx);
        const visit =
          (await visits.findByKey(space.id, key, tx)) ??
          (await visits.create(
            actor.id,
            {
              spaceId: space.id,
              key,
              visitorName: request.visitorName,
              audience: request.audience,
              shiftId: request.shiftId ?? null,
              rates: await visits.ratesAt(space.id, request, tx),
              checkedInAt,
            },
            tx,
          ));
        return { visit, warnings };
      });
    },

    /**
     * Checks a visit out, in one transaction and in this order: the space's lock and `can()`; the
     * visit's row (`FOR UPDATE`); for a visit already closed, the first result when this key made
     * it, else the visit as it is, recording nothing, or `VISIT_ALREADY_CLOSED` when the request
     * carries a payment. Otherwise its charge, at the quote's time, never before its check-in, nor
     * past the stay's due time, which then closes it (a stay never crosses into the next day), from
     * its rates and the rounding and cap in force; or, with no rate, the price typed by whoever
     * may type one, which they must; or none, an unpriced close. Any part left unpaid needs a phone,
     * whose customer it is then left to; the visit is closed, then the payment recorded, which the
     * ledger checks against the charge.
     */
    checkOutVisit(
      actor: Actor,
      space: LoadedSpace,
      visitId: number,
      key: string,
      request: CheckOutVisitRequest,
    ): Promise<VisitCheckOut> {
      return runInTransaction(async (tx) => {
        const links = await lockAtDesk(actor, space, tx);
        const requestedAt = now();
        const settings = await spaceSettings.read(space.id, tx);
        const locked = await visits.lockIn(space.id, visitId, tx);
        if (!locked) throw AppError.notFound(undefined, 'Visit not found');

        const recorded = await payments.findByKey(space.id, key, tx);
        if (recorded && recorded.visitId !== visitId) {
          throw AppError.conflict(undefined, 'This idempotency key paid another item');
        }
        if (!locked.open) {
          // Closed by another key: a payment taken for it now would be in no ledger.
          if (!recorded && request.payment) throw AppError.conflict('VISIT_ALREADY_CLOSED');
          return { visit: locked.visit, payment: recorded?.payment ?? null };
        }

        const pricedTo = pricedAt(request.checkedOutAt, requestedAt);
        if (pricedTo < locked.checkedInAt) {
          throw AppError.validation({ checkedOutAt: ['out_of_range'] });
        }
        const checkedOutAt = await visits.stayEndAt(space.id, locked, pricedTo, settings, tx);
        const computed = visits.chargeOf(locked, checkedOutAt, settings);
        const mayType = can(actor, 'prices.typeByHand', {
          links,
          receptionMayTypePrices: settings.receptionMayTypePrices,
        });
        let charge: VisitCharge | null = null;
        if (request.charge) {
          if (computed) throw AppError.validation({ charge: ['invalid_choice'] });
          if (!mayType) throw AppError.forbidden('PRICE_TYPING_NOT_ALLOWED');
          charge = {
            amountAgorot: request.charge.amountAgorot,
            roundingRule: null,
            roundingMinutes: null,
            capApplied: null,
            typedById: actor.id,
            reason: request.charge.reason,
          };
        } else if (computed) {
          const { amountAgorot, roundingRule, roundingMinutes, capApplied } = computed;
          charge = {
            amountAgorot,
            roundingRule,
            roundingMinutes,
            capApplied,
            typedById: null,
            reason: null,
          };
        } else if (mayType) {
          throw AppError.validation({ charge: ['required'] });
        }

        const paid = request.payment?.amountAgorot ?? 0;
        const leftUnpaid = charge === null || paid < charge.amountAgorot;
        const customerId = leftUnpaid
          ? await customerFor(actor, space, locked, request, tx)
          : locked.customerId;

        const visit = await visits.close(
          actor.id,
          space.id,
          visitId,
          { checkedOutAt, requestedAt, charge, customerId },
          tx,
        );
        const payment = request.payment
          ? await payments.record(
              {
                spaceId: space.id,
                item: { visitId },
                key,
                ...request.payment,
                recordedById: actor.id,
                receivedAt: requestedAt,
              },
              tx,
            )
          : null;
        return { visit, payment };
      });
    },

    /**
     * Receives a payment on one item, in one transaction: the space's lock and `can()`, then the
     * subscription's branch (`subscriptionPayment`), or, in this order: the visit's row (`FOR
     * UPDATE`); the payment this key recorded, for a retry, answered with the visit and the sums as
     * they are now; open → `conflict`; the payment, which the ledger checks (written off, unpriced,
     * above the balance) before any phone is asked; then, if anything remains, the customer it is
     * left to.
     */
    receivePayment(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      { visitId, subscriptionId, phone, customerName, ...payment }: ReceivePaymentRequest,
    ): Promise<ReceivedPayment> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'payments.record');
        if (subscriptionId !== undefined) {
          return subscriptionPayment(actor, space, subscriptionId, key, payment, tx);
        }
        // The schema lets no request name neither item.
        if (visitId === undefined) throw AppError.validation({ visitId: ['required'] });
        const locked = await visits.lockIn(space.id, visitId, tx);
        if (!locked) throw AppError.notFound(undefined, 'Visit not found');

        const recorded = await payments.findByKey(space.id, key, tx);
        if (recorded && recorded.visitId !== visitId) {
          throw AppError.conflict(undefined, 'This idempotency key paid another item');
        }
        if (recorded) {
          const { paidAgorot, balanceAgorot } = await balanceOf(space, locked, tx);
          return {
            visit: locked.visit,
            subscription: null,
            payment: recorded.payment,
            paidAgorot,
            balanceAgorot: balanceAgorot ?? 0,
          };
        }
        if (locked.open) {
          throw AppError.conflict(undefined, 'An open visit is paid at its check-out');
        }

        const received = await payments.record(
          {
            spaceId: space.id,
            item: { visitId },
            key,
            ...payment,
            recordedById: actor.id,
            receivedAt: now(),
          },
          tx,
        );
        const { paidAgorot, balanceAgorot } = await balanceOf(space, locked, tx);
        // The ledger took the payment, so the visit has a charge, and a balance.
        const rest = balanceAgorot ?? 0;
        let { visit } = locked;
        if (rest > 0) {
          const customerId = await customerFor(actor, space, locked, { phone, customerName }, tx);
          if (customerId !== locked.customerId) {
            visit = await visits.leaveTo(actor.id, space.id, visitId, customerId, tx);
          }
        }
        return { visit, subscription: null, payment: received, paidAgorot, balanceAgorot: rest };
      });
    },

    /**
     * «تسجيل دينًا» (DK-012): leaves a closed visit's unpaid rest to the phone's customer, with no
     * payment, in one transaction and in this order: the space's lock and `can()`; the visit's row;
     * open → `conflict`; written off → `VISIT_WRITTEN_OFF`; nothing owed → `VISIT_ALREADY_PAID` (an
     * unpriced visit has a debt to leave); the unpaid-part rule; the visit's own customer again →
     * the visit as it is.
     */
    leaveToCustomer(
      actor: Actor,
      space: LoadedSpace,
      visitId: number,
      request: LeaveToCustomerRequest,
    ): Promise<DeskVisit> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'payments.record');
        const locked = await lockClosed(space, visitId, tx);
        if (locked.visit.writeOff) throw AppError.conflict('VISIT_WRITTEN_OFF');
        const { balanceAgorot } = await balanceOf(space, locked, tx);
        if (balanceAgorot !== null && balanceAgorot <= 0) {
          throw AppError.conflict('VISIT_ALREADY_PAID');
        }
        const customerId = await customerFor(actor, space, locked, request, tx);
        if (customerId === locked.customerId) return locked.visit;
        return visits.leaveTo(actor.id, space.id, visitId, customerId, tx);
      });
    },

    /**
     * Writes off what a closed, priced visit still owes (K6), the owner's, in one transaction and
     * in this order: the space's lock and `can()`; the visit's row; open → `conflict`; already
     * written off → the visit as it is; no charge → `VISIT_NOT_PRICED`; nothing owed →
     * `VISIT_ALREADY_PAID`. Its payments stay.
     */
    writeOffVisit(
      actor: Actor,
      space: LoadedSpace,
      visitId: number,
      { reason }: WriteOffVisitRequest,
    ): Promise<DeskVisit> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'visits.writeOff');
        const locked = await lockClosed(space, visitId, tx);
        if (locked.visit.writeOff) return locked.visit;
        if (!locked.visit.charge) throw AppError.conflict('VISIT_NOT_PRICED');
        const { balanceAgorot } = await balanceOf(space, locked, tx);
        if (balanceAgorot === null || balanceAgorot <= 0) {
          throw AppError.conflict('VISIT_ALREADY_PAID');
        }
        return visits.writeOff(actor.id, space.id, visitId, { reason, balanceAgorot }, tx);
      });
    },

    /**
     * Subscribes a customer, in one transaction and in this order: the space's lock and `can()`
     * (`subscriptions.manage`); the subscription this key already made, another customer's →
     * `conflict`, else a retry, answered with the payments of its derived keys and the money as of
     * now; the customer, the space's (else
     * `not_found`) and not archived (`CUSTOMER_ARCHIVED`); the subscription it renews, locked, the
     * customer's own (else `invalid_choice` on `renewalOfId`) and not renewed yet
     * (`SUBSCRIPTION_ALREADY_RENEWED`); the package, the space's and offered (else `invalid_choice`
     * on `packageId`), or the typed terms (`termsOf`); the start date, the one sent, else the
     * renewal's proposal (`proposedStart`); the subscription, audited; then the payment, allocated
     * over the customer's older debts oldest first and the rest to the new one, one payment each
     * under a key derived from the request's, which the ledger checks. Warns `CUSTOMER_HAS_DEBT`
     * while an older item still owes.
     */
    subscribe(
      actor: Actor,
      space: LoadedSpace,
      customerId: number,
      key: string,
      request: SubscribeRequest,
    ): Promise<{ result: NewSubscription; warnings: DomainErrorCode[] }> {
      return runInTransaction(async (tx) => {
        const links = await lockAtDesk(actor, space, tx, 'subscriptions.manage');
        const at = now();
        const made = await subscriptions.findByKey(space.id, key, tx);
        if (made && made.customerId !== customerId) {
          throw AppError.conflict(undefined, 'This idempotency key made another subscription');
        }
        if (made) {
          const allocated = await payments.findByKeys(space.id, derivedKeys(key), tx);
          return subscribed(space, made, allocated, at, tx);
        }

        const customer = await customers.findIn(space.id, customerId, tx);
        if (!customer) throw AppError.notFound(undefined, 'Customer not found');
        if (customer.archivedAt) throw AppError.conflict('CUSTOMER_ARCHIVED');

        let renewed: SubscriptionState | null = null;
        if (request.renewalOfId !== undefined) {
          const locked = await subscriptions.lockIn(space.id, request.renewalOfId, tx);
          if (locked?.customerId !== customerId) {
            throw AppError.validation({ renewalOfId: ['invalid_choice'] });
          }
          if (locked.renewedById !== null) throw AppError.conflict('SUBSCRIPTION_ALREADY_RENEWED');
          [renewed = null] = await subscriptions.statesOf(space.id, { ids: [locked.id] }, at, tx);
        }

        let pack: PackageRow | null = null;
        if (request.packageId !== undefined) {
          pack = await packages.termsOf(space.id, request.packageId, tx);
          if (!pack?.isActive) throw AppError.validation({ packageId: ['invalid_choice'] });
        }
        const mayType =
          pack === null &&
          can(actor, 'prices.typeByHand', {
            links,
            receptionMayTypePrices: (await spaceSettings.read(space.id, tx)).receptionMayTypePrices,
          });
        const startsOn = request.startsOn ?? proposedStart(renewed, gazaClockOf(at).date);
        const terms = termsOf(actor, pack, request, startsOn, mayType);

        const created = await subscriptions.create(
          actor.id,
          {
            ...terms,
            spaceId: space.id,
            customerId,
            key,
            renewalOfId: renewed?.id ?? null,
            startsOn,
          },
          tx,
        );
        if ('refused' in created) {
          throw AppError.validation({ 'custom.shiftId': ['invalid_choice'] });
        }
        const subscription = { id: created.id, customerId };
        const allocated = request.payment
          ? await allocatePayment(actor, space, subscription, key, request.payment, at, tx)
          : [];
        return subscribed(space, subscription, allocated, at, tx);
      });
    },

    /**
     * Archives a customer, the owner's, in one transaction and in this order: the space's lock and
     * `can()` (`customers.archive`); the customer, the space's (else `not_found`); one already
     * archived answered as it is; one present, by an open check-in or an open visit →
     * `MEMBER_ALREADY_CHECKED_IN`, since the desk could no longer check them out from its list; then
     * archived. A customer who owes is archived too: the debt stays theirs.
     */
    archiveCustomer(actor: Actor, space: LoadedSpace, customerId: number): Promise<Customer> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'customers.archive');
        const customer = await customers.findIn(space.id, customerId, tx);
        if (!customer) throw AppError.notFound(undefined, 'Customer not found');
        if (customer.archivedAt) return customer;
        const [openCheckIns, openVisits] = await Promise.all([
          subscriptions.openCheckInsIn(space.id, tx),
          visits.openIn(space.id, tx),
        ]);
        const present = [...openCheckIns, ...openVisits].some(
          (stay) => stay.customerId === customerId,
        );
        if (present) throw AppError.conflict('MEMBER_ALREADY_CHECKED_IN');
        return customers.archive(actor, space, customerId, tx);
      });
    },

    /**
     * A page of the space's customers (docs/backend/conventions.md › Composed reads), every filter
     * applied before the page is cut: `subscriptions` answers the ids its status, kind and package
     * keep, `payments` the ids that owe or are in credit (`SETTLED`: neither, excluded); `customers`
     * then searches and pages those ids. Each row then gets its current subscription and its debt
     * and credit, for the page's ids only. Archived customers only under `ARCHIVED`, the owner's.
     * Read without a lock.
     */
    async customers(
      actor: Actor,
      space: LoadedSpace,
      { q, status, kind, packageId, payment, ...page }: CustomersQuery,
    ): Promise<{ rows: CustomerRow[]; total: number }> {
      const archived = status === 'ARCHIVED';
      if (archived && !can(actor, 'customers.archive', { links: space.links })) {
        throw AppError.forbidden();
      }
      const at = now();
      const include: number[][] = [];
      const exclude: number[] = [];
      const bySubscription = await subscriptions.customerIdsBy(
        space.id,
        { status: archived ? undefined : status, kind, packageId },
        at,
      );
      if (bySubscription.include) include.push(bySubscription.include);
      if (bySubscription.exclude) exclude.push(...bySubscription.exclude);
      if (payment === 'OWES' || payment === 'CREDIT') {
        include.push(await payments.customerIdsByPayment(space.id, payment, at));
      } else if (payment === 'SETTLED') {
        const [owing, inCredit] = await Promise.all([
          payments.customerIdsByPayment(space.id, 'OWES', at),
          payments.customerIdsByPayment(space.id, 'CREDIT', at),
        ]);
        exclude.push(...owing, ...inCredit);
      }

      const { rows, total } = await customers.page(
        space.id,
        { q, archived, include, exclude },
        page,
      );
      const ids = rows.map(({ id }) => id);
      const [current, balances] = await Promise.all([
        subscriptions.currentOf(space.id, ids, at),
        payments.customerBalances(space.id, ids, at),
      ]);
      return {
        rows: rows.map((customer) => {
          const state = current.get(customer.id);
          return {
            ...customer,
            current: state
              ? {
                  id: state.id,
                  name: state.name,
                  packageId: state.packageId,
                  endsOn: state.endsOn,
                  status: state.status,
                }
              : null,
            ...(balances.get(customer.id) ?? { debtAgorot: 0, creditAgorot: 0 }),
          };
        }),
        total,
      };
    },

    /**
     * The customer's file: the customer (not the space's → `not_found`); their debt and credit; who
     * of them is present; every subscription with its state and money; their unpaid visits — closed,
     * not written off, a balance above zero or none (unpriced) — the oldest first, each with its
     * payments, voided ones marked. The money from `payments`' one query. Read without a lock.
     */
    async customerFile(space: LoadedSpace, customerId: number): Promise<CustomerFile> {
      const customer = await customers.findIn(space.id, customerId);
      if (!customer) throw AppError.notFound(undefined, 'Customer not found');
      const at = now();
      const [states, items, balances, openCheckIns, openVisits] = await Promise.all([
        subscriptions.statesOf(space.id, { customerId }, at),
        payments.itemBalances(space.id, customerId, at),
        payments.customerBalances(space.id, [customerId], at),
        subscriptions.openCheckInsIn(space.id),
        visits.openIn(space.id),
      ]);

      const subscriptionMoney = new Map(
        items.flatMap((item) => (item.kind === 'SUBSCRIPTION' ? [[item.id, item] as const] : [])),
      );
      const unpaid = items.filter(
        ({ kind, balanceAgorot }) => kind === 'VISIT' && (balanceAgorot ?? 1) > 0,
      );
      const unpaidIds = unpaid.map(({ id }) => id);
      const [deskVisits, paymentsByVisit] = await Promise.all([
        visits.deskVisitsOf(space.id, unpaidIds),
        payments.paymentsFor(space.id, unpaidIds),
      ]);

      const checkIn = openCheckIns.find((open) => open.customerId === customerId);
      const visit = openVisits.find((open) => open.customerId === customerId);
      const present: CustomerPresence | null = checkIn
        ? {
            kind: 'CHECK_IN',
            id: checkIn.id,
            subscriptionId: checkIn.subscriptionId,
            since: checkIn.checkedInAt.toISOString(),
          }
        : visit
          ? { kind: 'VISIT', id: visit.id, since: visit.checkedInAt.toISOString() }
          : null;

      return {
        customer,
        ...(balances.get(customerId) ?? { debtAgorot: 0, creditAgorot: 0 }),
        present,
        subscriptions: states.map((state) => {
          const money = subscriptionMoney.get(state.id);
          const paidAgorot = money?.paidAgorot ?? 0;
          return { ...state, paidAgorot, balanceAgorot: money?.balanceAgorot ?? state.dueAgorot };
        }),
        unpaidVisits: unpaid.flatMap(({ id, paidAgorot, balanceAgorot }): UnpaidVisit[] => {
          const deskVisit = deskVisits.get(id);
          return deskVisit
            ? [
                {
                  visit: deskVisit,
                  payments: paymentsByVisit.get(id) ?? [],
                  paidAgorot,
                  balanceAgorot,
                },
              ]
            : [];
        }),
      };
    },

    /**
     * A subscription's statement (docs/backend/conventions.md › Composed reads): the subscription,
     * the space's (else `not_found`), with its state and money; its customer; its check-ins, each with
     * a closed stay's whole minutes; its payments, voided ones marked; and, while it is not renewed,
     * the start its renewal would take (`proposedStart`), else who renewed it. Its lists are whole,
     * bounded by one subscription. Read without a lock.
     */
    async statement(space: LoadedSpace, subscriptionId: number): Promise<SubscriptionStatement> {
      const at = now();
      const [state] = await subscriptions.statesOf(space.id, { ids: [subscriptionId] }, at);
      if (!state) throw AppError.notFound(undefined, 'Subscription not found');
      const [subscription, customer, checkIns, paymentsMade, renewedById] = await Promise.all([
        withMoney(space, state, at),
        customers.findIn(space.id, state.customerId),
        subscriptions.checkInsOf(space.id, subscriptionId),
        payments.paymentsOfSubscription(space.id, subscriptionId),
        subscriptions.renewedBy(space.id, subscriptionId),
      ]);
      if (!customer) throw new Error(`The subscription ${String(subscriptionId)} has no customer.`);
      return {
        ...subscription,
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
        checkIns: checkIns.map(({ id, checkedInAt, checkedOutAt, checkoutMethod }) => ({
          id,
          checkedInAt: checkedInAt.toISOString(),
          checkedOutAt: checkedOutAt?.toISOString() ?? null,
          checkoutMethod,
          minutes: checkedOutAt
            ? Math.floor((checkedOutAt.getTime() - checkedInAt.getTime()) / 60_000)
            : null,
        })),
        payments: paymentsMade,
        renewal:
          renewedById === null ? { startsOn: proposedStart(state, gazaClockOf(at).date) } : null,
        renewedById,
      };
    },

    /**
     * Undoes a visit's write-off, the owner's, in one transaction: the space's lock and `can()`;
     * the visit's row; not written off → the visit as it is.
     */
    undoWriteOff(actor: Actor, space: LoadedSpace, visitId: number): Promise<DeskVisit> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'visits.writeOff');
        const locked = await visits.lockIn(space.id, visitId, tx);
        if (!locked) throw AppError.notFound(undefined, 'Visit not found');
        const { writeOff } = locked.visit;
        if (!writeOff) return locked.visit;
        return visits.undoWriteOff(actor.id, space.id, visitId, writeOff, tx);
      });
    },
  };
}

export type DeskService = ReturnType<typeof createDeskService>;
