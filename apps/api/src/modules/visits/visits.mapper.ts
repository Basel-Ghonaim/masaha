import type { DeskVisit } from '@masaha/shared/visits';

import type { DeskVisitRow } from './visits.repository.ts';

/** A visit row as the desk is answered it (docs/api/api-contract.md › Front desk (managed)). */
export function toDeskVisit(row: DeskVisitRow): DeskVisit {
  return {
    id: row.id,
    visitorName: row.visitorName,
    customer: row.customer,
    audience: row.audience,
    shiftId: row.shiftId,
    hourRateAgorot: row.hourRateAgorot,
    dayRateAgorot: row.dayRateAgorot,
    checkedInAt: row.checkedInAt.toISOString(),
    checkedOutAt: row.checkedOutAt?.toISOString() ?? null,
    checkoutMethod: row.checkoutMethod,
    charge:
      row.chargeAgorot === null
        ? null
        : {
            amountAgorot: row.chargeAgorot,
            roundingRule: row.roundingRule,
            roundingMinutes: row.roundingMinutes,
            capApplied: row.capApplied,
            typedById: row.chargeSetById,
            reason: row.chargeReason,
          },
  };
}
