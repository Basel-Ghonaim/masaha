import type { SpaceSettings } from '@masaha/shared/space-settings';
import type {
  CheckInVisitRequest,
  DeskVisit,
  QuotedVisit,
  Rates,
  VisitTerms,
} from '@masaha/shared/visits';

import type { Tx } from '../../db/index.ts';
import type { AuditWriter } from '../../shared/audit/index.ts';
import { can, type Actor, type LoadedSpace } from '../../shared/auth/index.ts';
import { AppError } from '../../shared/errors/index.ts';
import type { SpaceSettingsService } from '../space-settings/index.ts';
import type { SpacesService } from '../spaces/index.ts';
import {
  billedMinutesOf,
  chargeOf,
  ratesFor,
  type Charge,
  type ChargeRule,
} from './visitCharge.ts';
import { toDeskVisit } from './visits.mapper.ts';
import {
  createVisitsRepository,
  type DeskVisitRow,
  type NewVisit,
  type OpenVisit,
  type VisitClosing,
} from './visits.repository.ts';

/** A visit locked for its check-out: what the desk answers, and what it decides on. */
export interface LockedVisit {
  visit: DeskVisit;
  visitorName: string | null;
  customerId: number | null;
  checkedInAt: Date;
  open: boolean;
  rates: Rates;
}

function toLocked(row: DeskVisitRow): LockedVisit {
  return {
    visit: toDeskVisit(row),
    visitorName: row.visitorName,
    customerId: row.customer?.id ?? null,
    checkedInAt: row.checkedInAt,
    open: row.checkedOutAt === null,
    rates: { hourAgorot: row.hourRateAgorot, dayAgorot: row.dayRateAgorot },
  };
}

interface Dependencies {
  audit: AuditWriter;
  spaces: SpacesService;
  spaceSettings: SpaceSettingsService;
  /** The one clock (conventions §11). */
  now: () => Date;
}

/** The rounding and the cap in force, from the space's settings. */
function ruleOf(settings: SpaceSettings): ChargeRule {
  return {
    rounding: settings.visitRounding,
    roundingMinutes: settings.visitRoundingMinutes,
    capAtDayPrice: settings.visitCapAtDayPrice,
  };
}

/** Whether two rates are the same, hour and day. */
const sameRates = (a: Rates, b: Rates) =>
  a.hourAgorot === b.hourAgorot && a.dayAgorot === b.dayAgorot;

/**
 * A visitor's stay at a space, checked in by name (docs/backend/conventions.md › the front desk):
 * its rates, its check-in, which `desk` orchestrates, and the reads `occupancy` composes *present*
 * from.
 */
export function createVisitsService({ audit, spaces, spaceSettings, now }: Dependencies) {
  const repository = createVisitsRepository();
  return {
    /** The space's visit created with this idempotency key, or `null`: a retried check-in. */
    async findByKey(spaceId: number, key: string, tx: Tx): Promise<DeskVisit | null> {
      const row = await repository.findByKey(spaceId, key, tx);
      return row && toDeskVisit(row);
    },

    /**
     * The rates a visit copies at its check-in, from the space's prices as they are now (data model
     * › Visit charge). A student visit is refused where the space turns student prices off.
     */
    async ratesAt(
      spaceId: number,
      { audience, shiftId }: Pick<CheckInVisitRequest, 'audience' | 'shiftId'>,
      tx: Tx,
    ): Promise<Rates> {
      if (audience === 'STUDENT' && !(await spaceSettings.read(spaceId, tx)).visitStudentPrices) {
        throw AppError.validation({ audience: ['invalid_choice'] });
      }
      return ratesFor(await spaces.pricesOf(spaceId, tx), { audience, shiftId: shiftId ?? null });
    },

    /**
     * Checks the visit in, in the caller's transaction, audited `visit.checkedIn`. A shift that is
     * not the space's is refused on `shiftId`.
     */
    async create(actorId: number, visit: NewVisit, tx: Tx): Promise<DeskVisit> {
      const row = await repository.create(visit, tx);
      if (!row) throw AppError.validation({ shiftId: ['invalid_choice'] });
      await audit(
        {
          actorId,
          action: 'visit.checkedIn',
          entityType: 'visit',
          entityId: row.id,
          spaceId: visit.spaceId,
          after: {
            visitorName: visit.visitorName,
            audience: visit.audience,
            shiftId: visit.shiftId,
            hourRateAgorot: visit.rates.hourAgorot,
            dayRateAgorot: visit.rates.dayAgorot,
          },
        },
        tx,
      );
      return toDeskVisit(row);
    },

    /**
     * Locks the visit's row for its check-out, in the caller's transaction (after the space's lock);
     * `null` when it is not the space's.
     */
    async lockIn(spaceId: number, visitId: number, tx: Tx): Promise<LockedVisit | null> {
      const row = await repository.lockIn(spaceId, visitId, tx);
      return row && toLocked(row);
    },

    /**
     * The visit's charge for its stay up to `to`, from the rates it copied at check-in and the
     * rounding and cap of these settings, the ones in force (data model › Visit charge); `null`
     * with no rate.
     */
    chargeOf(visit: LockedVisit, to: Date, settings: SpaceSettings): Charge | null {
      return chargeOf({ from: visit.checkedInAt, to }, visit.rates, ruleOf(settings));
    },

    /**
     * The space's visit, with its quote while it is open: its charge now, by the rates it copied
     * and the rounding and cap in force, at the time the desk can send back as the check-out's.
     * Read without a lock.
     */
    async quote(spaceId: number, visitId: number): Promise<QuotedVisit> {
      const row = await repository.findIn(spaceId, visitId);
      if (!row) throw AppError.notFound(undefined, 'Visit not found');
      const visit = toDeskVisit(row);
      if (row.checkedOutAt !== null) return { ...visit, quote: null };

      const at = now();
      const stay = { from: row.checkedInAt, to: at };
      const rates = { hourAgorot: row.hourRateAgorot, dayAgorot: row.dayRateAgorot };
      const charge = chargeOf(stay, rates, ruleOf(await spaceSettings.read(spaceId)));
      return {
        ...visit,
        quote: {
          at: at.toISOString(),
          chargeAgorot: charge?.amountAgorot ?? null,
          billedMinutes: billedMinutesOf(stay),
          capApplied: charge?.capApplied ?? null,
        },
      };
    },

    /**
     * The desk's terms for the caller: the rounding and the cap in force, whether they may type a
     * price, and the rates a visit would copy now with no shift and in each shift; the student
     * rates only where the space allows them and they change one (DI-41).
     */
    async terms(actor: Actor, space: LoadedSpace): Promise<VisitTerms> {
      const [settings, prices, shifts] = await Promise.all([
        spaceSettings.read(space.id),
        spaces.pricesOf(space.id),
        spaces.shiftsOf(space.id),
      ]);
      const rates = [null, ...shifts.map(({ id }) => id)].map((shiftId) => {
        const general = ratesFor(prices, { audience: 'GENERAL', shiftId });
        const student = ratesFor(prices, { audience: 'STUDENT', shiftId });
        return {
          shiftId,
          general,
          student: settings.visitStudentPrices && !sameRates(student, general) ? student : null,
        };
      });
      return {
        rounding: { rule: settings.visitRounding, minutes: settings.visitRoundingMinutes },
        capAtDayPrice: settings.visitCapAtDayPrice,
        mayTypePrice: can(actor, 'prices.typeByHand', {
          links: space.links,
          receptionMayTypePrices: settings.receptionMayTypePrices,
        }),
        rates,
      };
    },

    /**
     * What each of these open visits of the space costs so far, now, by id; `null` for a visit with
     * no rate. One query for the visits, one for the settings.
     */
    async chargesNow(
      spaceId: number,
      visitIds: readonly number[],
    ): Promise<Map<number, number | null>> {
      if (visitIds.length === 0) return new Map();
      const [rows, settings] = await Promise.all([
        repository.ratesOf(spaceId, visitIds),
        spaceSettings.read(spaceId),
      ]);
      const to = now();
      return new Map(
        rows.map(({ id, checkedInAt, hourRateAgorot, dayRateAgorot }) => [
          id,
          chargeOf(
            { from: checkedInAt, to },
            { hourAgorot: hourRateAgorot, dayAgorot: dayRateAgorot },
            ruleOf(settings),
          )?.amountAgorot ?? null,
        ]),
      );
    },

    /**
     * Closes the visit at the desk, in the caller's transaction, audited `visit.checkedOut` with the
     * quote's time it was closed at and the request's own time.
     */
    async close(
      actorId: number,
      spaceId: number,
      visitId: number,
      closing: VisitClosing & { requestedAt: Date },
      tx: Tx,
    ): Promise<DeskVisit> {
      const row = await repository.close(visitId, closing, tx);
      const { checkedOutAt, requestedAt, charge, customerId } = closing;
      await audit(
        {
          actorId,
          action: 'visit.checkedOut',
          entityType: 'visit',
          entityId: visitId,
          spaceId,
          after: {
            checkedOutAt: checkedOutAt.toISOString(),
            requestedAt: requestedAt.toISOString(),
            chargeAgorot: charge?.amountAgorot ?? null,
            capApplied: charge?.capApplied ?? null,
            typedById: charge?.typedById ?? null,
            reason: charge?.reason ?? null,
            customerId,
          },
        },
        tx,
      );
      return toDeskVisit(row);
    },

    /** The space's open visits, the earliest checked in first, then by id. */
    openIn(spaceId: number, tx?: Tx): Promise<OpenVisit[]> {
      return repository.openIn(spaceId, tx);
    },

    /** How many visits are open at each of these spaces, in one query; a space with none is absent. */
    openCountsIn(spaceIds: readonly number[]): Promise<Map<number, number>> {
      return repository.openCountsIn(spaceIds);
    },
  };
}

export type VisitsService = ReturnType<typeof createVisitsService>;
