import type { VisitCheckOut } from '@masaha/shared/desk';
import type { DeskVisit, QuotedVisit, VisitTerms } from '@masaha/shared/visits';

/** The desk's terms as the server answers them: ₪5 an hour up to ₪25, student rates, no typing. */
export function visitTerms(change: Partial<VisitTerms> = {}): VisitTerms {
  return {
    rounding: { rule: 'UP_AFTER_MINUTES', minutes: 15 },
    capAtDayPrice: true,
    mayTypePrice: false,
    rates: [
      {
        shiftId: null,
        general: { hourAgorot: 500, dayAgorot: 2500 },
        student: { hourAgorot: 400, dayAgorot: 2000 },
      },
    ],
    ...change,
  };
}

/** An open visit of space 7 with no customer, changed as a test needs. */
export function deskVisit(change: Partial<DeskVisit> = {}): DeskVisit {
  return {
    id: 12,
    visitorName: 'Omar',
    customer: null,
    audience: 'GENERAL',
    shiftId: null,
    hourRateAgorot: 500,
    dayRateAgorot: 2500,
    checkedInAt: '2026-07-01T07:00:00.000Z',
    checkedOutAt: null,
    checkoutMethod: null,
    charge: null,
    writeOff: null,
    ...change,
  };
}

/** The visit with its quote now: `charge` agorot (`null`: no rate), quoted at `at`. */
export function quotedVisit(
  charge: number | null,
  at: string = new Date().toISOString(),
  change: Partial<DeskVisit> = {},
): QuotedVisit {
  return {
    ...deskVisit(change),
    quote: { at, chargeAgorot: charge, billedMinutes: 135, capApplied: false },
  };
}

/** A check-out's answer: the visit closed with `charge`, and the payment taken, if any. */
export function checkedOut(
  charge: number | null,
  paid: { amountAgorot: number; method: 'CASH' | 'TRANSFER' } | null,
  change: Partial<DeskVisit> = {},
): VisitCheckOut {
  return {
    visit: deskVisit({
      checkedOutAt: '2026-07-01T09:15:00.000Z',
      checkoutMethod: 'MANUAL',
      charge:
        charge === null
          ? null
          : {
              amountAgorot: charge,
              roundingRule: 'UP_AFTER_MINUTES',
              roundingMinutes: 15,
              capApplied: false,
              typedById: null,
              reason: null,
            },
      ...change,
    }),
    payment:
      paid === null
        ? null
        : { id: 40, note: null, receivedAt: '2026-07-01T09:15:00.000Z', recordedById: 15, ...paid },
  };
}
