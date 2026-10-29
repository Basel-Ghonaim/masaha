import type { OwnerOverview } from '@masaha/shared/overview';

import type { LoadedSpace } from '../../shared/auth/index.ts';
import type { AnnouncementsService } from '../announcements/index.ts';
import type { DataReportsService } from '../data-reports/index.ts';
import type { OccupancyService } from '../occupancy/index.ts';
import type { PaymentsService } from '../payments/index.ts';
import type { ListingService } from '../spaces/index.ts';
import type { ClosuresService, SubscriptionsService } from '../subscriptions/index.ts';
import type { VisitsService } from '../visits/index.ts';

/** The modules the owner's overview reads, each the owner of its figures (conventions §9). */
export interface OwnerOverviewSources {
  listing: ListingService;
  dataReports: DataReportsService;
  visits: VisitsService;
  payments: PaymentsService;
  subscriptions: SubscriptionsService;
  closures: ClosuresService;
  announcements: AnnouncementsService;
  occupancy: OccupancyService;
}

/** How many of the subscriptions ending soon the overview names. */
const ENDING_SOON_NAMED = 5;

/**
 * The owner's overview of the space at `at` (screen 12; the owner's OV1–OV2): every figure read from
 * its owner in one parallel batch, with no lock and no snapshot (S21), and assembled field by field.
 * The money figures are counts: the balances' and the uncollected visits' amounts are dropped (O3).
 */
export async function ownerOverview(
  {
    listing,
    dataReports,
    visits,
    payments,
    subscriptions,
    closures,
    announcements,
    occupancy,
  }: OwnerOverviewSources,
  space: LoadedSpace,
  at: Date,
): Promise<OwnerOverview> {
  const [
    groups,
    openReports,
    uncollected,
    unpricedVisits,
    summary,
    balances,
    glance,
    endingSoon,
    types,
  ] = await Promise.all([
    listing.freshnessOf(space.id, at),
    dataReports.openCountOf(space.id),
    payments.uncollectedTotals(space.id),
    visits.unpricedCount(space.id),
    closures.summary(space.id, at),
    payments.balanceTotals(space.id, at),
    occupancy.glance(space, at),
    subscriptions.endingSoon(space.id, at, ENDING_SOON_NAMED),
    announcements.runningTypes(space.id, at),
  ]);
  return {
    attention: {
      groups,
      openReports,
      uncollectedVisits: uncollected.visits,
      unpricedVisits,
      closuresAwaitingExtension: summary.closuresAwaitingExtension,
      capacitySet: glance.capacity !== null,
      customersOwing: balances.owed.customers,
    },
    presentNow: { ...glance.present, capacity: glance.capacity, status: glance.status },
    endingSoon,
    announcements: { running: summary.running, types },
    at: at.toISOString(),
  };
}
