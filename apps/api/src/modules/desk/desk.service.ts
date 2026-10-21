import type { DomainErrorCode } from '@masaha/shared/core';
import type {
  CheckOutVisitRequest,
  LeaveToCustomerRequest,
  ReceivedPayment,
  ReceivePaymentRequest,
  VisitCheckOut,
} from '@masaha/shared/desk';
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
import type { CustomersService } from '../customers/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { PaymentsService } from '../payments/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import type { LockedVisit, VisitsService } from '../visits/index.ts';

interface Dependencies {
  runInTransaction: RunInTransaction;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
  visits: VisitsService;
  customers: CustomersService;
  payments: PaymentsService;
  occupancy: OccupancyService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

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
  customers,
  payments,
  occupancy,
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
          ? await payments.recordForVisit(
              {
                spaceId: space.id,
                visitId,
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
     * Receives a payment for a closed visit after its check-out, in one transaction and in this
     * order: the space's lock and `can()`; the visit's row (`FOR UPDATE`); the payment this key
     * recorded, for a retry, answered with the visit and the sums as they are now; open →
     * `conflict`; the payment, which the ledger checks (written off, unpriced, above the balance)
     * before any phone is asked; then, if anything remains, the customer it is left to.
     */
    receivePayment(
      actor: Actor,
      space: LoadedSpace,
      key: string,
      { visitId, phone, customerName, ...payment }: ReceivePaymentRequest,
    ): Promise<ReceivedPayment> {
      return runInTransaction(async (tx) => {
        await lockAtDesk(actor, space, tx, 'payments.record');
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
            payment: recorded.payment,
            paidAgorot,
            balanceAgorot: balanceAgorot ?? 0,
          };
        }
        if (locked.open) {
          throw AppError.conflict(undefined, 'An open visit is paid at its check-out');
        }

        const received = await payments.recordForVisit(
          {
            spaceId: space.id,
            visitId,
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
        return { visit, payment: received, paidAgorot, balanceAgorot: rest };
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
