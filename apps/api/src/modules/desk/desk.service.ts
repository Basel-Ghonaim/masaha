import type { DomainErrorCode } from '@masaha/shared/core';
import type { CheckOutVisitRequest, VisitCheckOut } from '@masaha/shared/desk';
import type { CheckInVisitRequest, DeskVisit, VisitCharge } from '@masaha/shared/visits';

import type { RunInTransaction, Tx } from '../../db/index.ts';
import { can, type Actor, type LoadedSpace, type SpaceLink } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { CustomersService } from '../customers/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { PaymentsService } from '../payments/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import type { VisitsService } from '../visits/index.ts';

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
   * `can()` on the links read under it, so a link ended meanwhile still decides (finding 43).
   */
  async function lockAtDesk(
    actor: Actor,
    space: LoadedSpace,
    tx: Tx,
  ): Promise<readonly SpaceLink[]> {
    if (!(await spaces.lock(space.id, tx))) {
      throw AppError.notFound(undefined, 'Space not found');
    }
    const links = await space.linksUnder(tx);
    if (!can(actor, 'attendance.record', { links })) throw AppError.forbidden();
    return links;
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
     * carries a payment. Otherwise its charge, at the quote's time, never before its check-in,
     * from its rates and the rounding and cap in force; or, with no rate, the price typed by whoever
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

        const checkedOutAt = pricedAt(request.checkedOutAt, requestedAt);
        if (checkedOutAt < locked.checkedInAt) {
          throw AppError.validation({ checkedOutAt: ['out_of_range'] });
        }
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
        let customerId = locked.customerId;
        if (leftUnpaid) {
          if (!request.phone) throw AppError.validation({ phone: ['required'] });
          const name = request.customerName ?? locked.visitorName ?? '';
          customerId = (
            await customers.findOrCreateByPhone(
              { spaceId: space.id, phone: request.phone, name, actorId: actor.id },
              tx,
            )
          ).id;
        }

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
  };
}

export type DeskService = ReturnType<typeof createDeskService>;
